"use client";
import Link from "next/link";
import type { ReactNode, PointerEvent } from "react";

/** A small progressive enhancement; navigation works without pointer animation. */
export function DepthLink({ href, className, children }: {href:string;className:string;children:ReactNode}) {
  function tilt(e:PointerEvent<HTMLAnchorElement>) {
    if(e.pointerType!=="mouse" || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const box=e.currentTarget.getBoundingClientRect();
    const x=(e.clientX-box.left)/box.width-.5, y=(e.clientY-box.top)/box.height-.5;
    e.currentTarget.style.transform=`perspective(1100px) rotateX(${-y*6}deg) rotateY(${x*6}deg) translateY(-3px)`;
  }
  return <Link href={href} className={className+" motion-safe:transition-transform motion-safe:duration-150"} onPointerMove={tilt} onPointerLeave={e=>{e.currentTarget.style.transform="";}} onBlur={e=>{e.currentTarget.style.transform="";}}>{children}</Link>;
}
