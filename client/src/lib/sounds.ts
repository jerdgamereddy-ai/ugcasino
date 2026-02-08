const audioCache: Record<string, HTMLAudioElement> = {};

const SOUND_URLS: Record<string, string> = {
  win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  spin: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  bet: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  flip: 'https://assets.mixkit.co/active_storage/sfx/2073/2073-preview.mp3',
  roll: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  reveal: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  jackpot: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  deal: 'https://assets.mixkit.co/active_storage/sfx/2009/2009-preview.mp3',
  bounce: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  shoot: 'https://assets.mixkit.co/active_storage/sfx/2785/2785-preview.mp3',
  splash: 'https://assets.mixkit.co/active_storage/sfx/2401/2401-preview.mp3',
  bubble: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
};

export type SoundType = keyof typeof SOUND_URLS;

export const playSound = (type: SoundType, volume: number = 0.4) => {
  const url = SOUND_URLS[type];
  if (!url) return;

  try {
    if (audioCache[type]) {
      const cached = audioCache[type];
      cached.currentTime = 0;
      cached.volume = Math.min(1, Math.max(0, volume));
      cached.play().catch(() => {});
    } else {
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, volume));
      audioCache[type] = audio;
      audio.play().catch(() => {});
    }
  } catch {
  }
};

export const preloadSounds = () => {
  Object.entries(SOUND_URLS).forEach(([key, url]) => {
    if (!audioCache[key]) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = url;
      audioCache[key] = audio;
    }
  });
};
