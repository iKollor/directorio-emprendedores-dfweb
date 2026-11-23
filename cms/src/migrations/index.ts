import * as migration_20261119_192939_inicial from './20261119_192939_inicial';
import * as migration_20261123_212116_logos from './20261123_212116_logos';
import * as migration_20261123_213957_videos from './20261123_213957_videos';

export const migrations = [
  {
    up: migration_20261119_192939_inicial.up,
    down: migration_20261119_192939_inicial.down,
    name: '20261119_192939_inicial',
  },
  {
    up: migration_20261123_212116_logos.up,
    down: migration_20261123_212116_logos.down,
    name: '20261123_212116_logos',
  },
  {
    up: migration_20261123_213957_videos.up,
    down: migration_20261123_213957_videos.down,
    name: '20261123_213957_videos'
  },
];
