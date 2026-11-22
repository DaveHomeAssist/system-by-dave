import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name('m1-inspect') / 'inspect-m1.sh'

# Every command the script may run, and for the risky ones the only argument shapes it may use. Anything else
# fails the test, so a later edit cannot quietly add a write, a launch, a setting change or a command to a device.
SHELL_WORDS = {'for', 'do', 'done', 'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'while', '[', '[[', 'in', '{', '}', '!', 'break', 'continue'}
PLAIN = {'echo', 'printf', 'none', 'h', 'exit', 'id', 'sw_vers', 'uname', 'date', 'uptime', 'grep', 'pgrep', 'ps', 'tr', 'sort',
         'cut', 'head', 'tail', 'awk', 'lsof', 'ls', 'df', 'stat', 'system_profiler', 'netstat', 'ifconfig', 'export', 'wc'}
RULES = {
    'sysctl': r'^sysctl -n \S+',
    'scutil': r'^scutil --get \w+',
    'defaults': r'^defaults read ',
    'launchctl': r'^launchctl list\b',
    'pmset': r'^pmset -g\b',
    'networksetup': r'^networksetup -list\w+',
    'route': r'^route -n get \S+',
    'arp': r'^arp -an\b',
    'osascript': r'^osascript -l JavaScript -e \'',
    'curl': r'^curl -sS -m 5 -w \'[^\']*\' "\$RELAY_URL/api/health"( 2>&1)?$',
    'find': r'^find (\"\$HOME\"|/Volumes) -maxdepth \d (-name \'\*\.millumin\' )?(-not -path \'\*/Library/\*\' )?-exec stat -f ',
    'sed': r'^sed \'s/\^n//\'$',
    'tailscale': r'^"\$TAILSCALE" (ip -4|status)\b',
}
FORBIDDEN_ANYWHERE = [r'\bsudo\b', r'\bsystemsetup\b', r'\bdiskutil\b', r'\bcsrutil\b', r'\btccutil\b', r'\bspctl\b', r'\bkillall\b',
                      r'\bpkill\b', r'\bkill\b', r'\bdscl\b', r'\bssh\b', r'\bscp\b', r'\bping\b', r'\bnc\b', r'\bgit\b',
                      r'tell application', r'System Events', r'Millumin\S*\.app/Contents/MacOS', r'curl .*(-X|--data|-d |-F |-T |--upload)']


def shell_lines():
    """Non-comment script lines, with the one inline JavaScript block removed."""
    lines, in_js = [], False
    for raw in SCRIPT.read_text(encoding='utf-8').splitlines():
        if "osascript -l JavaScript -e '" in raw:
            in_js = True
            lines.append(raw.split("-e '")[0] + "-e '")
            if raw.rstrip().endswith("2>&1 || none") and raw.count("'") >= 2:
                in_js = False
            continue
        if in_js:
            if raw.rstrip().endswith("' 2>&1 || none"):
                in_js = False
            continue
        if raw.strip().startswith('#') or not raw.strip():
            continue
        lines.append(raw)
    return lines


def command_segments(source):
    """Every command in the script, including ones inside $( ) even when that sits inside double quotes.

    A small quote-aware scanner: single quotes are literal, double quotes are literal except for $( ), and an
    unquoted | ; && newline ) ends a command. Each returned string is one command's raw text."""
    out = []

    def scan(i, closer):
        buf = []

        def flush():
            text = ''.join(buf).strip()
            if text:
                out.append(text)
            del buf[:]

        while i < len(source):
            c = source[i]
            if closer and c == closer:
                flush()
                return i + 1
            if c == "'":
                j = source.index("'", i + 1)
                buf.append(source[i:j + 1])
                i = j + 1
            elif c == '"':
                j = i + 1
                buf.append('"')
                while source[j] != '"':
                    if source[j] == '\\':
                        buf.append(source[j:j + 2])
                        j += 2
                    elif source.startswith('$(', j):
                        k = scan(j + 2, ')')
                        buf.append(source[j:k])
                        j = k
                    else:
                        buf.append(source[j])
                        j += 1
                buf.append('"')
                i = j + 1
            elif source.startswith('$(', i):
                k = scan(i + 2, ')')
                buf.append(source[i:k])
                i = k
            elif c == '`':
                raise AssertionError('backticks are not allowed in the inspection script')
            elif c in '|;\n)' or (c == '&' and source[i - 1:i] not in ('>', '<') and source[i + 1:i + 2] != '>'):
                flush()
                i += 1
            else:
                buf.append(c)
                i += 1
        flush()
        return i

    scan(0, None)
    return out


class ReadOnlyInspectionTests(unittest.TestCase):
    def test_script_exists_and_parses(self):
        self.assertTrue(SCRIPT.exists())
        subprocess.run(['bash', '-n', str(SCRIPT)], check=True)

    def test_no_forbidden_command_anywhere(self):
        body = '\n'.join(shell_lines())
        for pattern in FORBIDDEN_ANYWHERE:
            self.assertIsNone(re.search(pattern, body), 'forbidden pattern %r found' % pattern)

    def test_every_command_is_allowed_and_read_only(self):
        source = '\n'.join(l for l in SCRIPT.read_text(encoding='utf-8').splitlines() if not l.strip().startswith('#'))
        seen = set()
        for text in command_segments(source):
            text = re.sub(r'^(do|then|else)\s+', '', text).lstrip('{').strip()
            if not text or re.match(r'^\w+=', text) or re.match(r'^\w+\(\)?$', text):
                continue  # an assignment (its inner commands are listed separately) or a function name
            first = text.split()[0]
            if first.startswith(('"$TAILSCALE"', '$TAILSCALE')):
                first = 'tailscale'
            seen.add(first)
            if first in SHELL_WORDS or re.match(r'^[<>0-9&*"\'\[$-]', first) and first != 'tailscale':
                continue
            if first in PLAIN:
                if first == 'sed':
                    self.assertNotIn(' -i', text)
                continue
            self.assertIn(first, RULES, 'command %r is not on the read-only list: %s' % (first, text[:120]))
            self.assertRegex(text, RULES[first], 'command %r uses arguments outside the read-only shapes: %s' % (first, text[:120]))
        # the scanner must actually be seeing the commands, including ones inside quoted substitutions
        self.assertTrue({'osascript', 'pmset', 'curl', 'tailscale', 'uname', 'sysctl', 'ifconfig'} <= seen, sorted(seen))

    def test_no_file_writes(self):
        for line in shell_lines():
            stripped = re.sub(r'"[^"]*"|\'[^\']*\'', '', line)  # ignore quoted text
            stripped = re.sub(r'2>&1|2>/dev/null|>/dev/null|&>/dev/null', '', stripped)
            self.assertNotRegex(stripped, r'(^|[^-])>>?\s*[^\s&=]', 'redirect to a file in: %s' % line.strip())
            self.assertNotRegex(stripped, r'<<', 'here-document in: %s' % line.strip())

    @unittest.skipUnless(sys.platform == 'darwin', 'needs the macOS tools the script reads')
    def test_runs_on_a_mac_and_leaves_an_empty_home_empty(self):
        with tempfile.TemporaryDirectory() as home:
            env = dict(os.environ, HOME=home, TMPDIR=home, INSPECT_RELAY_URL='http://127.0.0.1:9')
            done = subprocess.run(['bash', str(SCRIPT)], env=env, capture_output=True, text=True, timeout=120)
            self.assertEqual(done.returncode, 0, done.stderr)
            self.assertIn('END OF REPORT', done.stdout)
            for number in range(1, 9):
                self.assertIn('### %d.' % number, done.stdout)
            leftovers = [str(p.relative_to(home)) for p in Path(home).rglob('*')]
            self.assertEqual(leftovers, [], 'the script wrote files under HOME')

    def test_refuses_to_run_as_root(self):
        text = SCRIPT.read_text(encoding='utf-8')
        self.assertIn('"$(id -u)" = "0"', text)


if __name__ == '__main__':
    unittest.main()
