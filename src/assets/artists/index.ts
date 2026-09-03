/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run images:fetch` (scripts/fetch-images.ts) from whatever
 * is actually on disk, so it cannot drift from the mirrored files.
 *
 * React Native resolves static assets at build time, so every path here has
 * to be a literal `require()` — a computed path would bundle nothing.
 */

import type { ImageSourcePropType } from 'react-native';

export { brandImages } from '../brand';
export type { BrandImages } from '../brand';

/** The bundled copies of one artist's photos. */
export interface ArtistImageSet {
  /** Lineup-grid crop, ~600px wide. */
  readonly card: ImageSourcePropType;
  /** Detail-screen crop, ~1000px wide, when the festival published a distinct one. */
  readonly hero?: ImageSourcePropType;
}

/** Slug → bundled photos. */
export const artistImages: Readonly<Record<string, ArtistImageSet>> = {
  'marcus-king-band': {
    card: require('./marcus-king-band.jpg'),
    hero: require('./marcus-king-band@hero.jpg'),
  },
  'taj-mahal-keb-mo': {
    card: require('./taj-mahal-keb-mo.jpg'),
    hero: require('./taj-mahal-keb-mo@hero.jpg'),
  },
  'jon-batiste': {
    card: require('./jon-batiste.jpg'),
    hero: require('./jon-batiste@hero.jpg'),
  },
  'daniel-donatos-cosmic-country': {
    card: require('./daniel-donatos-cosmic-country.jpg'),
    hero: require('./daniel-donatos-cosmic-country@hero.jpg'),
  },
  'the-record-company': {
    card: require('./the-record-company.jpg'),
    hero: require('./the-record-company@hero.jpg'),
  },
  'samantha-fish-2026': {
    card: require('./samantha-fish-2026.jpg'),
    hero: require('./samantha-fish-2026@hero.jpg'),
  },
  'g-love-special-sauce': {
    card: require('./g-love-special-sauce.jpg'),
    hero: require('./g-love-special-sauce@hero.jpg'),
  },
  'charlie-musselwhite-ga20': {
    card: require('./charlie-musselwhite-ga20.jpg'),
    hero: require('./charlie-musselwhite-ga20@hero.jpg'),
  },
  'tab-benoit-2026': {
    card: require('./tab-benoit-2026.jpg'),
    hero: require('./tab-benoit-2026@hero.jpg'),
  },
  'eggy': {
    card: require('./eggy.jpg'),
    hero: require('./eggy@hero.jpg'),
  },
  'eddie-9v': {
    card: require('./eddie-9v.jpg'),
    hero: require('./eddie-9v@hero.jpg'),
  },
  'greyhounds': {
    card: require('./greyhounds.jpg'),
    hero: require('./greyhounds@hero.jpg'),
  },
  'judith-hill': {
    card: require('./judith-hill.jpg'),
    hero: require('./judith-hill@hero.jpg'),
  },
  'nether-hour': {
    card: require('./nether-hour.jpg'),
    hero: require('./nether-hour@hero.jpg'),
  },
  'myron-elkins': {
    card: require('./myron-elkins.jpg'),
    hero: require('./myron-elkins@hero.jpg'),
  },
  'dk-harrell': {
    card: require('./dk-harrell.jpg'),
    hero: require('./dk-harrell@hero.jpg'),
  },
  'the-harlem-gospel-travelers': {
    card: require('./the-harlem-gospel-travelers.jpg'),
    hero: require('./the-harlem-gospel-travelers@hero.jpg'),
  },
  'j-the-causeways': {
    card: require('./j-the-causeways.jpg'),
    hero: require('./j-the-causeways@hero.jpg'),
  },
  'kirk-fletcher-2026': {
    card: require('./kirk-fletcher-2026.jpg'),
    hero: require('./kirk-fletcher-2026@hero.jpg'),
  },
  'david-jacobsstrain-and-bob-beach': {
    card: require('./david-jacobsstrain-and-bob-beach.jpg'),
    hero: require('./david-jacobsstrain-and-bob-beach@hero.jpg'),
  },
  'zac-shulze-gang': {
    card: require('./zac-shulze-gang.jpg'),
    hero: require('./zac-shulze-gang@hero.jpg'),
  },
  'derrick-dove-the-peacekeepers': {
    card: require('./derrick-dove-the-peacekeepers.jpg'),
    hero: require('./derrick-dove-the-peacekeepers@hero.jpg'),
  },
  'ken-valdez': {
    card: require('./ken-valdez.jpg'),
    hero: require('./ken-valdez@hero.jpg'),
  },
  'nigel-wearne-the-spectres': {
    card: require('./nigel-wearne-the-spectres.jpg'),
    hero: require('./nigel-wearne-the-spectres@hero.jpg'),
  },
  'katie-skene': {
    card: require('./katie-skene.jpg'),
    hero: require('./katie-skene@hero.jpg'),
  },
  'alex-maryol': {
    card: require('./alex-maryol.jpg'),
    hero: require('./alex-maryol@hero.jpg'),
  },
  'little-willie-farmer': {
    card: require('./little-willie-farmer.jpg'),
    hero: require('./little-willie-farmer@hero.jpg'),
  },
  'albert-white-2026': {
    card: require('./albert-white-2026.jpg'),
    hero: require('./albert-white-2026@hero.jpg'),
  },
  'terry-harmonica-bean-2026': {
    card: require('./terry-harmonica-bean-2026.jpg'),
    hero: require('./terry-harmonica-bean-2026@hero.jpg'),
  },
  'scramble-campbell-2026': {
    card: require('./scramble-campbell-2026.jpg'),
    hero: require('./scramble-campbell-2026@hero.jpg'),
  },
  'troy-walker-2026': {
    card: require('./troy-walker-2026.jpg'),
    hero: require('./troy-walker-2026@hero.jpg'),
  },
  'baron-vaughn': {
    card: require('./baron-vaughn.jpg'),
    hero: require('./baron-vaughn@hero.jpg'),
  },
  'kiran-deol': {
    card: require('./kiran-deol.jpg'),
    hero: require('./kiran-deol@hero.jpg'),
  },
  'hannah-jones': {
    card: require('./hannah-jones.jpg'),
    hero: require('./hannah-jones@hero.jpg'),
  },
};

/**
 * Remote URL → the bundled copy of that exact image.
 *
 * The snapshot keeps its Squarespace URLs as provenance, and the card and
 * hero components pass those URLs down, so this lets a mirrored file be
 * found without every call site having to learn about slugs.
 */
export const artistImagesByRemoteUrl: Readonly<Record<string, ImageSourcePropType>> = {
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433216417-L45YMEUG2Z65XR40FE0M/2026-website-artist-gallery-icons-1-marcus-king-band.jpg': require('./marcus-king-band.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/096cf2ec-8fb0-428f-a035-113bb4d59f39/marcus-king-web.jpg': require('./marcus-king-band@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433216494-48OTNF0IGGD63DWFRG5B/2026-website-artist-gallery-icons-2-taj-mahal-keb-mo.jpg': require('./taj-mahal-keb-mo.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/7ec8d2f8-4011-4073-9c7e-3014bd801efc/taj-mahal-keb-mo-web.jpg': require('./taj-mahal-keb-mo@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433218639-PXVUPTM90E0NIX8QCPRK/2026-website-artist-gallery-icons-3-jon-batiste.jpg': require('./jon-batiste.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/42342544-8dfb-4726-8671-9cee1039c85e/jon-batiste.jpg': require('./jon-batiste@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433219042-MVOWOAZVSXV7KA8VO1EM/2026-website-artist-gallery-icons-4-daniel-donato.jpg': require('./daniel-donatos-cosmic-country.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/6bfca6ba-3ca6-4c99-b069-ccf53c840008/daniel-donato-web.jpg': require('./daniel-donatos-cosmic-country@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433220327-XD5WPSUHVXJACOUMOJ6Q/2026-website-artist-gallery-icons-5-the-record-company.jpg': require('./the-record-company.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/b7905eb9-1063-44b7-8ca6-494f897105e5/the-record-company-web.jpg': require('./the-record-company@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433220820-EA9DLWH4N0CTGYUH90WC/2026-website-artist-gallery-icons-6-samantha-fish.jpg': require('./samantha-fish-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1ff47bbd-7dc8-4496-969e-24e0920e7909/samantha-fish-web.jpg': require('./samantha-fish-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433221838-0MO59SYC5CWKXFHU6QNK/2026-website-artist-gallery-icons-7-g-love.jpg': require('./g-love-special-sauce.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1710646b-f0a0-4168-9439-55f3b474c93a/g-love-web.jpg': require('./g-love-special-sauce@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773681772719-A3A5OIRN6S7VYMYY4D9L/2026-website-artist-gallery-icons-8-charlie-musselwhite.jpg': require('./charlie-musselwhite-ga20.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/b7086424-fbbb-4f83-9a09-478329ade2c7/charlie-musselwhite-ga-20-web-2.jpg': require('./charlie-musselwhite-ga20@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433224595-EUJ6THQV2GJCZEUUODSU/2026-website-artist-gallery-icons-9-tab-benoit.jpg': require('./tab-benoit-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/518717b4-6c35-4a74-8947-c4610839d9d8/tab-benoit-web.jpg': require('./tab-benoit-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768619353-VPCRPV4PJ3CTT3AARLFI/2026-website-artist-gallery-icons-additional-artists-eggy.jpg': require('./eggy.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/d6d0c072-beb4-421d-9667-6e7f2183f9e5/eggy-web.jpg': require('./eggy@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433226135-IWUVLJ5OX33ORT00Q9EJ/2026-website-artist-gallery-icons-10-eddie-9v.jpg': require('./eddie-9v.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/3acce3d8-51b2-47de-90ef-771db3e4743a/eddie-9v-web.jpg': require('./eddie-9v@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433226658-SHHAVYMXVYLT38Q6BEPS/2026-website-artist-gallery-icons-11-greyhounds.jpg': require('./greyhounds.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1e8c8124-a627-4fe6-bed7-a11217a46510/the-greyhounds-web.jpg': require('./greyhounds@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433227703-M1E5Z03E8OV9PPOGUBRI/2026-website-artist-gallery-icons-12-judith-hill.jpg': require('./judith-hill.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/42415f6c-f3c7-4699-b899-eb61d95ee97d/judith-hill-web.jpg': require('./judith-hill@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768622537-QDTYVAMJKYW725EUXMVZ/2026-website-artist-gallery-icons-additional-artists-nether-hour.jpg': require('./nether-hour.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/6dfb10b8-9d0a-4c06-9524-f654ce34ec99/nether-hour-web.jpg': require('./nether-hour@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433228431-RGIG97168GJOO4JTG632/2026-website-artist-gallery-icons-13-myron-elkins.jpg': require('./myron-elkins.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/e3a64804-a486-4816-9b1b-ed794bb8a3b4/myron-elkins-web.jpg': require('./myron-elkins@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433229395-TJWB2TQ143CDEH3Z9TKJ/2026-website-artist-gallery-icons-14-dk-harrell.jpg': require('./dk-harrell.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/4c9519ad-201f-429b-8c06-0ce7db1725b5/dk-harrell-web.jpg': require('./dk-harrell@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768622815-TO2PMHG8XEWJMBIRLYSK/2026-website-artist-gallery-icons-additional-artists-the-harlem-gospel-travelers.jpg': require('./the-harlem-gospel-travelers.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/e4c6dd0c-8833-4d3b-ae7a-17cf13bb2797/harlem-gospel-travelers-web.jpg': require('./the-harlem-gospel-travelers@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433230068-FIDIW5QBACIHQP8JUAS9/2026-website-artist-gallery-icons-15-j-and-the-causeways.jpg': require('./j-the-causeways.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/bc2d9859-bfb4-420b-87e1-91da5d01af03/j-and-the-causeways-web.jpg': require('./j-the-causeways@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433230897-QMEKFRID9G4GYMQAB003/2026-website-artist-gallery-icons-16-kirk-fletcher.jpg': require('./kirk-fletcher-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/5a175d6b-b81f-4f29-86b7-280cd8ce8a6a/kirk-fletcher-web.jpg': require('./kirk-fletcher-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433231644-WILOB3DWGQ7UXBG2ZFH1/2026-website-artist-gallery-icons-17-david-jacobs-strain-and-bob-beach.jpg': require('./david-jacobsstrain-and-bob-beach.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/9ed2ce5a-5e76-4d45-b541-93a8b71fc8d5/david-jacobs-strain-bob-beach-web.jpg': require('./david-jacobsstrain-and-bob-beach@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433233135-91719H3XXSK8HJF6RBEJ/2026-website-artist-gallery-icons-18-the-zac-shulze-gang.jpg': require('./zac-shulze-gang.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/c2214b35-fea7-40de-b555-fae2ce622198/zac-shulze-gang-web.jpg': require('./zac-shulze-gang@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768619246-ZDIJIHEIYNEQZTTJYIC8/2026-website-artist-gallery-icons-additional-artists-derrick-dove-peacekeepers.jpg': require('./derrick-dove-the-peacekeepers.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/2ae4ceba-78f8-4c9a-b43d-1f4933d154ff/derrick-dove-the-peacekeepers.jpg': require('./derrick-dove-the-peacekeepers@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768621339-UF7549SN63BEBP59VRM3/2026-website-artist-gallery-icons-additional-artists-ken-valdez.jpg': require('./ken-valdez.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/d6afc709-ad21-40ed-abca-2a50937e7741/ken-valdez.jpg': require('./ken-valdez@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433233776-3MB01048YUT2KOHER49C/2026-website-artist-gallery-icons-19-nigel-wearne.jpg': require('./nigel-wearne-the-spectres.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1dd21087-e65d-40db-98f5-41c630aa0fe1/nigel-wearne.jpg': require('./nigel-wearne-the-spectres@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768620492-OKD95KCB8KIV5SWFE6P2/2026-website-artist-gallery-icons-additional-artists-katie-skene.jpg': require('./katie-skene.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/a5b695b1-1e6c-405c-9ffb-4253df117c73/katie-skene-web.jpg': require('./katie-skene@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768617958-PG2E1VY5U97OPP9LOAMY/2026-website-artist-gallery-icons-additional-artists-alex-maryol.jpg': require('./alex-maryol.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/9e389a1f-cd58-4df3-86b3-b31359701dc4/alex-maryol.jpg': require('./alex-maryol@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433236254-4O1B4W96HYQJB31L48JP/2026-website-artist-gallery-icons-little-willie-farmer.jpg': require('./little-willie-farmer.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/b28f7144-2208-4568-8a2e-38a4b05472f7/Little-Willie-Farmer-web.jpg': require('./little-willie-farmer@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773769017792-4GJ09B3LTL91D0WAFXIW/2026-website-artist-gallery-icons-additional-artists-albert-white.jpg': require('./albert-white-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1622576843744-EDHZ4CWMA5BJPZC88JE5/Albert-White-web.jpeg': require('./albert-white-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433238439-K713Z2ZC977ZP0125OW2/2026-website-artist-gallery-icons-terry-harmonica-bean.jpg': require('./terry-harmonica-bean-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/c0679d47-6696-4127-9c2a-74993ad5ae84/Terry-Harmonica-Bean-web.jpg': require('./terry-harmonica-bean-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1768433236747-KI6YPGP7KDOJYO9RDXEO/2026-website-artist-gallery-icons-scramble-campbell.jpg': require('./scramble-campbell-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1742262493052-CY1JV4TS7PRXEJVEWKYE/scramble-campbell-web.jpg': require('./scramble-campbell-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773769036473-JT0T5W7ZLXVSFS8MX5GF/2026-website-artist-gallery-icons-20-troy-walker.jpg': require('./troy-walker-2026.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1556658712594-5HEY8MNX9YL7GXPU3NB7/Troy-Walker-Web.jpg': require('./troy-walker-2026@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768617954-SH3E3360E18DHNK3JILE/2026-website-artist-gallery-icons-additional-artists-baron-vaugn.jpg': require('./baron-vaughn.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/b6ba41bd-df77-4909-9e33-8df4c0855f8b/baron-vaughn.jpg': require('./baron-vaughn@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768621706-YW3LU84SRB8VNDJES7E4/2026-website-artist-gallery-icons-additional-artists-kiran-deol.jpg': require('./kiran-deol.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/abb3404a-607e-40a1-b0b6-557a63ea3e40/kiran-deol.jpg': require('./kiran-deol@hero.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/1773768620275-HJ0DQ9UL4FUZ1OOOAA7B/2026-website-artist-gallery-icons-additional-artists-hannah-jones.jpg': require('./hannah-jones.jpg'),
  'https://images.squarespace-cdn.com/content/v1/5be480544611a0a58ac2f320/a827c0b8-5841-4343-84e6-b402cc31c34a/hannah-jones.jpg': require('./hannah-jones@hero.jpg'),
};
