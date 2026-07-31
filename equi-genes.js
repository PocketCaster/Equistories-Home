// ============================================================
//  EQUI_BUILTIN_LOCI — snapshot of the built-in gene list from
//  stable.html's GENETIC_LOCI. DATA ONLY (no breeding math).
//  Read by the breed-import COPIER in index.html so staff can pick
//  genes for a custom order. Custom genes come from config/global
//  live; this file is just the built-ins.
//  If you ever change built-in genes in stable.html, regenerate this.
// ============================================================
window.EQUI_BUILTIN_LOCI = [
  { key:"extension", label:"Extension (E) — base pigment", base:true,
    options:[
      {code:"EE", desc:"Black-based"},
      {code:"Ee", desc:"Black-based (carries red)"},
      {code:"ee", desc:"Red-based / Chestnut"},
    ]},
  // Dominance hierarchy: A+ (wild-type) > A (bay) > At (seal bay) > a (black).
  // A+ is the "wild" allele — on chestnut (ee) it's silent (just Chestnut, same
  // as if it weren't there at all — see computeBaseColor), but on any
  // black-based horse (EE/Ee) it produces Wild Bay, the base of the whole
  // "wild chain" (Wild Buckskin = Wild Bay + Cream, Wild Amber Champagne =
  // Wild Bay + Champagne, etc. — every dilution that normally acts on Bay
  // acts the same way on Wild Bay, just tagged "Wild").
  { key:"agouti", label:"Agouti (A) — distributes black", base:true, requiresAny:{extension:["EE","Ee","ee"]},
    // Agouti is the most versatile locus: four alleles at ONE locus, in the
    // dominance order A+ (wild) > A (bay) > At (seal/liver) > a. At is a
    // dominant Liver allele — AtAt gives the very dark "black" chestnut,
    // while one At alongside ANY other agouti allele gives liver chestnut
    // (Ata, AtA, A+At, Atat). "at" is just the lowercase (absent) spelling
    // of At, so it means the same as "a" — hence Atat and Ata are the same
    // horse. Aliasing it keeps crosses from breeding nonsense like "atat".
    alleles:["A+","A","At","a"],
    alleleAliases:{ at:"a" },
    options:[
      {code:"A+A+", desc:"Chestnut / Wild Bay (homozygous)"},
      {code:"A+A", desc:"Chestnut / Wild Bay"},
      {code:"A+At", desc:"Liver Chestnut / Wild Bay"},
      {code:"A+a", desc:"Chestnut / Wild Bay"},
      {code:"AA", desc:"Chestnut / Bay"},
      {code:"Aa", desc:"Chestnut / Bay"},
      {code:"aa", desc:"Black"},
      {code:"AtA", desc:"Liver Chestnut / Seal Bay"},
      {code:"Ata", desc:"Liver Chestnut / Seal Bay"},
      {code:"AtAt", desc:"Black Chestnut / Seal Bay (homozygous)"},
      {code:"Atat", desc:"Liver Chestnut / Seal Bay"},
    ]},
  { key:"sooty", label:"Sooty (Sty)",
    options:[
      {code:"stysty", desc:"No Sooty", price:0},
      {code:"Stysty", desc:"Sooty", price:100},
      {code:"StySty", desc:"Sooty (homozygous)", price:100},
    ]},
  { key:"pangare", label:"Pangare (Png)",
    options:[
      {code:"pngpng", desc:"No Pangare", price:0},
      {code:"Pngpng", desc:"Pangare", price:100},
      {code:"PngPng", desc:"Pangare (homozygous)", price:100},
    ]},
  // Cream and Pearl are not two genes — they are two alleles of the SAME locus
  // (MATP / SLC45A2), alongside the non-dilute wild-type "n". A horse carries
  // exactly two of {Cr, Prl, n}, which is why "one Cream AND two Pearls" can
  // never occur. The six real genotypes (n written first on single alleles):
  //
  //   nn      no dilution
  //   nCr     one Cream   — Palomino / Buckskin / Smoky Black
  //   CrCr    two Creams  — Cremello / Perlino / Smoky Cream
  //   nPrl    one Pearl   — carried, invisible on its own
  //   PrlPrl  two Pearls  — Apricot / Amber Pearl / Black Pearl
  //   CrPrl   one of each — a "pseudo-double dilute": Palomino Pearl looks like
  //                         a Cremello, Buckskin Pearl looks like a Perlino
  { key:"creampearl", label:"Cream & Pearl (Cr / Prl) — one locus",
    // Cream and Pearl are two alleles of ONE locus, alongside the non-dilute
    // wild type. A horse carries exactly two of {Cr, Prl, n} — which is why
    // "one Cream AND two Pearls" can never happen.
    //
    // Written the standard way, the second copy of a single-dilute horse is
    // spelled with that gene's own lowercase (Crcr, Prlprl). Both of those
    // lowercase forms mean the same thing genetically — "not a dilute" — so
    // they alias onto the single null allele n. Without this, Crcr x Crcr
    // would breed a nonsense "crcr" instead of "nn".
    alleles:["Cr","Prl","n"],
    alleleAliases:{ cr:"n", prl:"n" },
    pairCode:{ "n+n":"nn", "Cr+n":"Crcr", "Prl+n":"Prlprl",
               "Cr+Cr":"CrCr", "Prl+Prl":"PrlPrl", "Cr+Prl":"CrPrl" },
    options:[
      {code:"nn", desc:"No Cream or Pearl", price:0},
      {code:"Crcr", desc:"Single Cream (Palomino / Buckskin / Smoky Black)", price:100},
      {code:"CrCr", desc:"Double Cream (Cremello / Perlino / Smoky Cream)", price:500},
      {code:"Prlprl", desc:"Pearl carrier (no visible dilution)", price:150},
      {code:"PrlPrl", desc:"Double Pearl (Apricot / Amber Pearl / Black Pearl)", price:400},
      {code:"CrPrl", desc:"Cream Pearl — false double dilute (Palomino Pearl / Buckskin Pearl / Smoky Black Pearl)", price:500},
    ]},
  { key:"dun", label:"Dun (D)",
    options:[
      {code:"dd", desc:"No Dun", price:0},
      {code:"Dd", desc:"Dun", price:100},
      {code:"DD", desc:"Dun (homozygous)", price:100},
    ]},
  { key:"champagne", label:"Champagne (Ch)",
    options:[
      {code:"chch", desc:"No Champagne", price:0},
      {code:"Chch", desc:"Champagne", price:700},
      {code:"ChCh", desc:"Champagne (homozygous)", price:700},
    ]},
  // Silver and Flaxen can each be CARRIED on either base color, but only
  // VISUALLY EXPRESSED on one: Silver shows on black-based horses
  // (EE/Ee), Flaxen shows on chestnut (ee). A chestnut can carry Silver
  // invisibly, and a black-based horse can carry Flaxen invisibly. So
  // unlike the other loci, these are never hidden by requiresAny — the
  // genotype is always selectable — and computeGenoResult() below decides
  // whether the carried allele is actually expressed in the phenotype
  // (and priced) based on the horse's Extension.
  { key:"silver", label:"Silver Dapple (Z) — carrier allowed on chestnut, only expressed on black-based", requiresAny:null,
    options:[
      {code:"zz", desc:"No Silver", price:0},
      {code:"Zz", desc:"Silver Dapple", price:150},
      {code:"ZZ", desc:"Silver Dapple (homozygous)", price:150},
    ]},
  { key:"flaxen", label:"Flaxen (F) — carrier allowed on black-based, only expressed on chestnut", requiresAny:null,
    options:[
      {code:"ff", desc:"No Flaxen", price:0},
      {code:"Ff", desc:"Flaxen", price:150},
      {code:"FF", desc:"Flaxen (homozygous)", price:150},
    ]},
  { key:"grey", label:"Grey (G)",
    options:[
      {code:"gg", desc:"No Grey", price:0},
      {code:"Gg", desc:"Fleabitten Grey", price:150},
      {code:"GG", desc:"Dappled Grey", price:200},
    ]},
  { key:"roan", label:"Roan (Rn)",
    options:[
      {code:"rnrn", desc:"No Roan", price:0},
      {code:"Rnrn", desc:"Roan", price:100},
      {code:"RnRn", desc:"Roan (homozygous)", price:100},
    ]},
  { key:"rabicano", label:"Rabicano (Rb)",
    options:[
      {code:"rbrb", desc:"No Rabicano", price:0},
      {code:"Rbrb", desc:"Rabicano", price:150},
       {code:"RbRb", desc:"Rabicano (homozygous)", price:150},
    ]},
  { key:"tobiano", label:"Tobiano (TO)",
    options:[
      {code:"toto", desc:"No Tobiano", price:0},
      {code:"Toto", desc:"Tobiano", price:200},
      {code:"ToTo", desc:"Tobiano (homozygous)", price:200},
    ]},
  { key:"sabino1", label:"Sabino (Sb)",
    options:[
      {code:"sbsb", desc:"No Sabino", price:0},
      {code:"Sbsb", desc:"Sabino", price:200},
      {code:"SbSb", desc:"Sabino-White (mostly/all white)", price:350},
    ]},
  { key:"splash", label:"Splash White (Spl)",
    options:[
      {code:"splspl", desc:"No Splash", price:0},
      {code:"Splspl", desc:"Splash White", price:200},
      {code:"SplSpl", desc:"Splash White (homozygous)", price:200},
    ]},
  { key:"frame", label:"Frame Overo (O)",
    options:[
      {code:"oo", desc:"No Frame", price:0},
      {code:"Oo", desc:"Frame Overo (OO is lethal white — never pair two carriers)", price:200},
    ]},
  { key:"dominantwhite", label:"Dominant White (W)",
    options:[
      {code:"ww", desc:"No Dominant White", price:0},
      {code:"Ww", desc:"Dominant White (WW is typically embryonic lethal — never pair two carriers)", price:250},
    ]},
  { key:"manchado", label:"Manchado (Ma)",
    options:[
      {code:"mama", desc:"No Manchado", price:0},
      {code:"Mama", desc:"Manchado", price:350},
    ]},
  { key:"leopard", label:"Leopard Complex (Lp)",
    options:[
      {code:"lplp", desc:"No Leopard Complex", price:0},
      {code:"Lplp", desc:"Heterozygous Leopard Complex", price:0},
      {code:"LpLp", desc:"Homozygous Leopard Complex", price:0},
    ]},
  { key:"patn1", label:"Pattern-1 (PATN1)", requiresAny:{leopard:["Lplp","LpLp"]},
    options:[
      {code:"patn1patn1", desc:"No Pattern-1", price:0},
      {code:"PATN1patn1", desc:"Carries Pattern-1", price:0},
      {code:"PATN1PATN1", desc:"Homozygous Pattern-1", price:0},
    ]},
  { key:"patn2", label:"Pattern-2 (PATN2)", requiresAny:{leopard:["Lplp","LpLp"]},
    options:[
      {code:"patn2patn2", desc:"No Pattern-2", price:0},
      {code:"PATN2patn2", desc:"Carries Pattern-2", price:0},
      {code:"PATN2PATN2", desc:"Homozygous Pattern-2", price:0},
    ]},
  // The built-in ILB Exclusive loci (Fairylock, Dove Dilute, Mouse Dilute)
  // have been removed for testing — add them back yourself via
  // Admin > Custom Genes to confirm the whole pipeline (breed checkbox,
  // gene grid, Net Worth pricing) still works end-to-end.
];

// Global rare traits that apply to every breed (from stable.html
// GLOBAL_TRAIT_DEFAULTS). The copier merges these with each breed's own
// rareTraits (from config/global.customBreeds[breed].rareTraits) so staff can
// tick which traits an import/NPC carries; the breeding engine passes them at
// the listed chance.
window.EQUI_GLOBAL_TRAITS = [
  { type:"flat", name:"Birdcatcher Spots", chance:10 },
  { type:"flat", name:"Dom White", chance:10 },
  { type:"conditional", name:"Gulastra Plume", chance:30, requires:{locus:"sabino1", anyOf:["Sbsb"]}, requiresLabel:"Sabino (Sbsb)" }
];
