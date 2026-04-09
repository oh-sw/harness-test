// Each character has a fixed seed so the same face is generated deterministically
// on every page load. The seed drives face parameter generation via generateFacePixels.

export const CHARACTERS = [
  {
    id: 'hyunjae',
    name: '현재',
    seed: 1001,
    faceParams: {
      skinTone: '#F5C5A3',
      hairStyle: 'short',
      hairColor: '#1A1A1A',
      eyeColor: '#3B2A1A',
      beard: 'none',
    },
  },
  {
    id: 'jaehyun',
    name: '재현',
    seed: 2002,
    faceParams: {
      skinTone: '#E8A87C',
      hairStyle: 'parted',
      hairColor: '#4A3728',
      eyeColor: '#2C1E0F',
      beard: 'stubble',
    },
  },
  {
    id: 'sangwoo',
    name: '상우',
    seed: 3003,
    faceParams: {
      skinTone: '#D4956A',
      hairStyle: 'buzz',
      hairColor: '#0D0D0D',
      eyeColor: '#1A0E00',
      beard: 'full',
    },
  },
  {
    id: 'hangyeol',
    name: '한결',
    seed: 4004,
    faceParams: {
      skinTone: '#FADADC',
      hairStyle: 'long',
      hairColor: '#8B5E3C',
      eyeColor: '#4A3000',
      beard: 'none',
    },
  },
  {
    id: 'junghun',
    name: '중훈',
    seed: 5005,
    faceParams: {
      skinTone: '#C68642',
      hairStyle: 'short',
      hairColor: '#2C1810',
      eyeColor: '#1C1000',
      beard: 'mustache',
    },
  },
];
