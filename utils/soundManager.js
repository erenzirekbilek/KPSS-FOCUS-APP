import { Audio } from "expo-av";

const sounds = {};

const soundFiles = {
  click: require("../assets/sounds/click.mp3"), // , // "correct" key → success.wav
  wrong: require("../assets/sounds/error.mp3"), // "wrong" key → error.mp3
};

let isLoaded = false;

export const preloadSounds = async () => {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });

    for (const key of Object.keys(soundFiles)) {
      const { sound } = await Audio.Sound.createAsync(soundFiles[key], {
        shouldPlay: false,
      });

      sounds[key] = sound;
      console.log("Loaded sound:", key);
    }

    isLoaded = true;
    console.log("Sounds preloaded successfully");
  } catch (e) {
    console.log("Preload error:", e);
  }
};

export const playSound = async (key) => {
  if (!isLoaded) {
    console.log("Sounds not loaded yet");
    return;
  }

  const sound = sounds[key];

  if (!sound) {
    console.log("Sound", key, "not found");
    return;
  }

  try {
    await sound.stopAsync();
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (e) {
    console.log("Play error:", e);
  }
};
