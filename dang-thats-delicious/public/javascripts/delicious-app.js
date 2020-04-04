import '../sass/style.scss';
import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

autocomplete($('#address'), $('#lat'), $('#lng'))

typeAhead( $('.search') );
makeMap( $('#map') );

const heartForms = $$('form.heart');
heartForms.on('submit', ajaxHeart);

// Note: This is actually our front-end application. All of our html is sent from the server through PUG, so
// we don't actually have a static copy. All of the functions above run for every request. The autocomplete
// has a return clause for when the input is empty, which would occur for any page other than the Add Store page

// This seems efficient to develop, but redundant for the server
