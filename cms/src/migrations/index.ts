import * as migration_20261119_191755_inicial from './20261119_191755_inicial';

export const migrations = [
  {
    up: migration_20261119_191755_inicial.up,
    down: migration_20261119_191755_inicial.down,
    name: '20261119_191755_inicial'
  },
];
