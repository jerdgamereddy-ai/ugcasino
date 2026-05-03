import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Upload, Palette, Image as ImageIcon, Sparkles, RotateCcw } from "lucide-react";
import type { SiteSettings, BackgroundImage } from "@shared/schema";

const GRADIENT_PRESETS = [
  { label: "Royal Black-Gold",      value: "linear-gradient(135deg, #000000 0%, #1a1208 50%, #d4af37 100%)" },
  { label: "Crimson Casino",        value: "linear-gradient(135deg, #1a0000 0%, #4a0010 50%, #d4af37 100%)" },
  { label: "Deep Space Purple",     value: "linear-gradient(135deg, #0a0014 0%, #2a0a3a 50%, #6a1a8a 100%)" },
  { label: "Emerald Felt",          value: "linear-gradient(135deg, #001a0a 0%, #003a1a 50%, #00633a 100%)" },
  { label: "Neon Sunset",           value: "linear-gradient(135deg, #1a0033 0%, #ff0080 50%, #ffaa00 100%)" },
  { label: "Midnight Sapphire",     value: "linear-gradient(135deg, #000010 0%, #001a4a 50%, #2a4aff 100%)" },
];

const ANIMATION_PRESETS = [
  { key: "site-bg-aurora",       label: "Aurora Drift",   desc: "Slow purple/teal/gold flow" },
  { key: "site-bg-casino-neon",  label: "Casino Neon",    desc: "Crimson/sapphire neon waves" },
  { key: "site-bg-gold-rush",    label: "Gold Rush",      desc: "Warm gold gradient breathe" },
  { key: "site-bg-starfield",    label: "Starfield",      desc: "Drifting multicolor stars" },
];

export function AppearanceControl() {
  const { toast } = useToast();
  const { data: settings } = useQuery<SiteSettings>({ queryKey: ["/api/site-settings"] });
  const { data: bgImages = [] } = useQuery<BackgroundImage[]>({ queryKey: ["/api/admin/backgrounds"] });
  const fileRef = useRef<HTMLInputElement>(null);

  const [color, setColor] = useState("#0a0a18");
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0].value);

  useEffect(() => {
    if (settings?.bgColor) setColor(settings.bgColor);
    if (settings?.bgGradient) setGradient(settings.bgGradient);
  }, [settings?.bgColor, settings?.bgGradient]);

  const saveMutation = useMutation({
    mutationFn: async (patch: Partial<SiteSettings>) => {
      const res = await apiRequest("POST", "/api/admin/site-settings", patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Background updated", description: "Site background applied." });
    },
    onError: () => toast({ title: "Save failed", description: "Could not update background.", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/admin/backgrounds", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      return res.json();
    },
    onSuccess: (img: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backgrounds"] });
      toast({ title: "Image uploaded", description: img.originalName });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/backgrounds/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backgrounds"] });
      toast({ title: "Image deleted" });
    },
  });

  const activeUrl = settings?.bgImageUrl;

  return (
    <Card className="bg-black/40 border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-400">
          <Palette className="w-5 h-5" /> Site Appearance
        </CardTitle>
        <CardDescription>
          Customize the background of the entire site. Choose a solid color, a gradient, an uploaded image / GIF, or an animated preset.
          Current mode: <span className="text-yellow-300 font-mono">{settings?.bgType ?? "default"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="color" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="color" data-testid="tab-bg-color"><Palette className="w-3 h-3 mr-1" />Color</TabsTrigger>
            <TabsTrigger value="gradient" data-testid="tab-bg-gradient"><Sparkles className="w-3 h-3 mr-1" />Gradient</TabsTrigger>
            <TabsTrigger value="image" data-testid="tab-bg-image"><ImageIcon className="w-3 h-3 mr-1" />Image / GIF</TabsTrigger>
            <TabsTrigger value="animation" data-testid="tab-bg-animation"><Sparkles className="w-3 h-3 mr-1" />Animation</TabsTrigger>
            <TabsTrigger value="reset" data-testid="tab-bg-reset"><RotateCcw className="w-3 h-3 mr-1" />Reset</TabsTrigger>
          </TabsList>

          <TabsContent value="color" className="space-y-3">
            <Label className="text-xs">Background Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-16 rounded border border-white/20 bg-transparent cursor-pointer"
                data-testid="input-bg-color-picker"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono w-40" data-testid="input-bg-color-hex" />
              <div className="h-10 flex-1 rounded border border-white/10" style={{ background: color }} />
              <Button onClick={() => saveMutation.mutate({ bgType: "color", bgColor: color })} disabled={saveMutation.isPending} data-testid="button-save-bg-color">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Color"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="space-y-3">
            <Label className="text-xs">Gradient Presets</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setGradient(p.value)}
                  className={`relative h-20 rounded-lg border-2 overflow-hidden transition ${gradient === p.value ? "border-yellow-400" : "border-white/10 hover:border-white/30"}`}
                  style={{ background: p.value }}
                  data-testid={`preset-gradient-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/50 rounded px-1 py-0.5">{p.label}</span>
                </button>
              ))}
            </div>
            <Label className="text-xs">Custom CSS Gradient</Label>
            <Input value={gradient} onChange={(e) => setGradient(e.target.value)} placeholder="linear-gradient(...)" className="font-mono text-xs" data-testid="input-bg-gradient-css" />
            <div className="h-16 rounded border border-white/10" style={{ background: gradient }} />
            <Button onClick={() => saveMutation.mutate({ bgType: "gradient", bgGradient: gradient })} disabled={saveMutation.isPending} data-testid="button-save-bg-gradient">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply Gradient"}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-3">
            <Label className="text-xs">Upload Background (JPG / PNG / WEBP / GIF / AVIF, max 15MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMutation.mutate(f);
                }}
                disabled={uploadMutation.isPending}
                data-testid="input-bg-image-upload"
              />
              {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
            <Label className="text-xs mt-2">Library — click to set as background</Label>
            {bgImages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {bgImages.map((img) => {
                  const url = `/uploads/backgrounds/${img.filename}`;
                  const isActive = activeUrl === url && settings?.bgType === "image";
                  return (
                    <div key={img.id} className={`relative rounded overflow-hidden border-2 ${isActive ? "border-yellow-400" : "border-white/10"}`}>
                      <button
                        onClick={() => saveMutation.mutate({ bgType: "image", bgImageUrl: url })}
                        className="block w-full aspect-video"
                        style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
                        title={img.originalName}
                        data-testid={`button-bg-pick-${img.id}`}
                      />
                      <button
                        onClick={() => deleteMutation.mutate(img.id)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded p-1"
                        data-testid={`button-bg-delete-${img.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/60 px-1 truncate">{img.originalName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="animation" className="space-y-3">
            <Label className="text-xs">Animated Backgrounds — pure CSS, no perf cost</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ANIMATION_PRESETS.map((a) => {
                const isActive = settings?.bgType === "animation" && settings?.bgAnimation === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => saveMutation.mutate({ bgType: "animation", bgAnimation: a.key })}
                    className={`relative h-24 rounded-lg border-2 overflow-hidden transition text-left ${isActive ? "border-yellow-400" : "border-white/10 hover:border-white/30"}`}
                    data-testid={`button-bg-animation-${a.key}`}
                  >
                    <div className={`absolute inset-0 ${a.key}`} />
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-2">
                      <div className="text-sm font-bold text-white">{a.label}</div>
                      <div className="text-[10px] text-white/80">{a.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="reset" className="space-y-3">
            <p className="text-sm text-muted-foreground">Restore the default site background.</p>
            <Button
              variant="destructive"
              onClick={() => saveMutation.mutate({ bgType: "default" })}
              disabled={saveMutation.isPending}
              data-testid="button-bg-reset"
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Restore Default Background
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
