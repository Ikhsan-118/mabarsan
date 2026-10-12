// Menghubungkan G.kind -> renderer. Renderer hanya membuat HTML dari state; tidak mengubah state.
import * as domino from './domino/renderer.js';
import * as rummy from './rummy/renderer.js';
import * as cangkulan from './cangkulan/renderer.js';
import * as uno from './uno/renderer.js';
import * as fortyOne from './forty-one/renderer.js';
import * as remi from './remi/renderer.js';
import * as capsa from './capsa/renderer.js';
import * as checkers from './checkers/renderer.js';
import * as ludo from './ludo/renderer.js';
import * as chess from './chess/renderer.js';
export const RENDERERS={domino,rummy,cangkulan,uno,'forty-one':fortyOne,remi,capsa,checkers,ludo,chess};
