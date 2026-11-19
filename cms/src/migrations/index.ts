import * as migration_20261119_192939_inicial from './20261119_192939_inicial';

export const migrations = [
  {
    up: migration_20261119_192939_inicial.up,
    down: migration_20261119_192939_inicial.down,
    name: '20261119_192939_inicial'
  },
];
