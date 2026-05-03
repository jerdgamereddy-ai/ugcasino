import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SiteSettings } from "@shared/schema";

const ANIMATION_CLASSES = [
  "site-bg-aurora",
  "site-bg-casino-neon",
  "site-bg-gold-rush",
  "site-bg-starfield",
];

export default function SiteBackground() {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
    refetchInterval: 30000,
    staleTime: 10000,
  });

  useEffect(() => {
    const body = document.body;
    ANIMATION_CLASSES.forEach((c) => body.classList.remove(c));
    body.style.backgroundImage = "";
    body.style.backgroundColor = "";
    body.style.backgroundSize = "";
    body.style.backgroundRepeat = "";
    body.style.backgroundAttachment = "";
    body.style.backgroundPosition = "";

    if (!data || data.bgType === "default") return;

    if (data.bgType === "color" && data.bgColor) {
      body.style.backgroundColor = data.bgColor;
    } else if (data.bgType === "gradient" && data.bgGradient) {
      body.style.backgroundImage = data.bgGradient;
    } else if (data.bgType === "image" && data.bgImageUrl) {
      body.style.backgroundImage = `url(${JSON.stringify(data.bgImageUrl)})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundRepeat = "no-repeat";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundPosition = "center";
    } else if (data.bgType === "animation" && data.bgAnimation) {
      if (ANIMATION_CLASSES.includes(data.bgAnimation)) {
        body.classList.add(data.bgAnimation);
      }
    }
  }, [data?.bgType, data?.bgColor, data?.bgGradient, data?.bgImageUrl, data?.bgAnimation]);

  return null;
}
