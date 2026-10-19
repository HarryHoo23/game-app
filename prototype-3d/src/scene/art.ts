import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import ball from "../assets/hoop/basketball.png";
import board from "../assets/hoop/backboard.png";
import net from "../assets/hoop/net.png";
import rimFront from "../assets/hoop/rim_front.png";
import rimBack from "../assets/hoop/rim_back.png";
export const hoopArt = { ball, board, net, rimFront, rimBack };
/** Keep source PNGs intact; texture windows remove their transparent sprite padding. */
export function useArtTexture(
  url: string,
  crop?: readonly [number, number, number, number],
) {
  const source = useTexture(url),
    [x, y, w, h] = crop ?? [0, 0, 1254, 1254];
  const texture = useMemo(() => {
    const t = source.clone();
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    t.offset.set(x / 1254, 1 - (y + h) / 1254);
    t.repeat.set(w / 1254, h / 1254);
    t.needsUpdate = true;
    return t;
  }, [source, x, y, w, h]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
