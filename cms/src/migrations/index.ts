import * as migration_20261119_192939_inicial from './20261119_192939_inicial';
import * as migration_20261123_212116_logos from './20261123_212116_logos';

export const migrations = [
  {
    up: migration_20261119_192939_inicial.up,
    down: migration_20261119_192939_inicial.down,
    name: '20261119_192939_inicial',
  },
  {
    up: migration_20261123_212116_logos.up,
    down: migration_20261123_212116_logos.down,
    name: '20261123_212116_logos'
  },
];
