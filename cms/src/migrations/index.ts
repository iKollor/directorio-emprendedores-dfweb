import * as migration_20261119_192939_inicial from './20261119_192939_inicial';
import * as migration_20261123_212116_logos from './20261123_212116_logos';
import * as migration_20261123_213957_videos from './20261123_213957_videos';
import * as migration_20261123_221230_textos_sin_genero from './20261123_221230_textos_sin_genero';
import * as migration_20261124_024446_sin_franja_videos from './20261124_024446_sin_franja_videos';
import * as migration_20261124_055331_videos_con_sonido from './20261124_055331_videos_con_sonido';
import * as migration_20261124_183244_pantalla_completa from './20261124_183244_pantalla_completa';
import * as migration_20261125_051117_mensaje_whatsapp from './20261125_051117_mensaje_whatsapp';
import * as migration_20261125_054543_lema_escuela from './20261125_054543_lema_escuela';
import * as migration_20261125_164052_buscador from './20261125_164052_buscador';

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
    name: '20261123_213957_videos',
  },
  {
    up: migration_20261123_221230_textos_sin_genero.up,
    down: migration_20261123_221230_textos_sin_genero.down,
    name: '20261123_221230_textos_sin_genero',
  },
  {
    up: migration_20261124_024446_sin_franja_videos.up,
    down: migration_20261124_024446_sin_franja_videos.down,
    name: '20261124_024446_sin_franja_videos',
  },
  {
    up: migration_20261124_055331_videos_con_sonido.up,
    down: migration_20261124_055331_videos_con_sonido.down,
    name: '20261124_055331_videos_con_sonido',
  },
  {
    up: migration_20261124_183244_pantalla_completa.up,
    down: migration_20261124_183244_pantalla_completa.down,
    name: '20261124_183244_pantalla_completa',
  },
  {
    up: migration_20261125_051117_mensaje_whatsapp.up,
    down: migration_20261125_051117_mensaje_whatsapp.down,
    name: '20261125_051117_mensaje_whatsapp',
  },
  {
    up: migration_20261125_054543_lema_escuela.up,
    down: migration_20261125_054543_lema_escuela.down,
    name: '20261125_054543_lema_escuela',
  },
  {
    up: migration_20261125_164052_buscador.up,
    down: migration_20261125_164052_buscador.down,
    name: '20261125_164052_buscador'
  },
];
