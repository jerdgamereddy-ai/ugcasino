export const playSound = (type: 'win' | 'lose' | 'click' | 'spin') => {
  const sounds: Record<string, string> = {
    win: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
    lose: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
    click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
    spin: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  };

  const audio = new Audio(sounds[type]);
  audio.volume = 0.4;
  audio.play().catch(() => {
    // Ignore autoplay blocks
  });
};
