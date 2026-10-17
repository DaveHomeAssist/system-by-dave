import { describe, expect, it } from 'vitest';
import { EQUIPMENT, stateKey, readState, storeState } from './state';
describe('gear panel snapshots', () => {
 it('isolates panel and view identities without colliding on delimiters', () => { expect(stateKey('a:b', 'c')).not.toBe(stateKey('a', 'b:c')); expect(stateKey('view1','panel')).not.toBe(stateKey('view2','panel')); });
 it('restores known snapshots and retains unreadable or future data', () => { const data=new Map<string,string>();const store={getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v);}};const state={version:1 as const,equipment:EQUIPMENT,selected:'ion-about'};expect(storeState(store,'one',state)).toBe(true);expect(readState(store,'one')).toEqual(state);data.set('one','{"version":2}');expect(readState(store,'one')).toBeUndefined();expect(data.get('one')).toBe('{"version":2}');data.set('one','bad');expect(readState(store,'one')).toBeUndefined();expect(data.get('one')).toBe('bad'); });
 it('reports unavailable storage without throwing', () => {const store={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};expect(readState(store,'one')).toBeUndefined();expect(storeState(store,'one',{version:1,equipment:EQUIPMENT})).toBe(false);});
});
