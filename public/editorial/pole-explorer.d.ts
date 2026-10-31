export type PoleScene = {setExplode(value:number):void;setAuto(value:boolean):void;rotate(delta:number):void;reset():void;dispose():void};
export function mountPoleExplorer(host:HTMLElement, three:typeof import('three'), onFailure?:()=>void):PoleScene;
