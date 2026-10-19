import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import manifest from "../assets/production/manifest.json";
import leather from "../assets/production/leather.webp";
import board from "../assets/production/board.webp";
import net from "../assets/production/net.webp";
import rim from "../assets/production/rim.webp";
import { configureArtTexture } from "./artGeometry";
const urls = { leather, board, net, rim };
export const hoopArt = {
  ball: "leather",
  board: "board",
  net: "net",
  rim: "rim",
} as const;
/** One cached GPU texture per derived asset; source PNGs stay editable and unmodified. */
export function useArtTexture(key: keyof typeof urls) {
  const texture = useTexture(urls[key]);
  return useMemo(
    () => configureArtTexture(texture, manifest.assets[key], key),
    [texture, key],
  );
}
