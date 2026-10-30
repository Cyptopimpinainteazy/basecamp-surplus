import Image from "next/image";

/** next/image wrapper: SVG sources (dev seed art) bypass the optimizer. */
export function GearImage(props: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <Image
      src={props.src}
      alt={props.alt}
      fill
      sizes={props.sizes}
      priority={props.priority}
      unoptimized={props.src.endsWith(".svg")}
      className={props.className ?? "object-cover"}
    />
  );
}
