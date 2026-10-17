/** Kerala Event — POS (order from Foodeza Kerala menu PDF) */
window.FOODEZA_MENU = [
  { id: 'appam_stew', menuGroup: 'Kerala Event', category: 'Breakfast', name: 'Appam with Veg Stew & Tea', priceCents: 850, active: true, image: 'appam_stew' },
  { id: 'appam_egg', menuGroup: 'Kerala Event', category: 'Breakfast', name: 'Appam with Egg Curry & Tea', priceCents: 850, active: true, image: 'appam_egg' },

  { id: 'chicken_biryani', menuGroup: 'Kerala Event', category: 'Main Courses', name: 'Kerala Chicken Biryani', priceCents: 1250, active: true, image: 'kerala_biriyani' },
  { id: 'biriyani_veg', menuGroup: 'Kerala Event', category: 'Main Courses', name: 'Veg Biryani', priceCents: 900, active: true, image: 'biriyani_veg' },
  { id: 'porotta_pork', menuGroup: 'Kerala Event', category: 'Main Courses', name: 'Kerala Porotta with Pork Fry', priceCents: 1050, active: true, image: 'porotta_pork' },
  { id: 'porotta_chicken', menuGroup: 'Kerala Event', category: 'Main Courses', name: 'Kerala Porotta with Chicken Curry', priceCents: 1050, active: true, image: 'porotta_chicken' },
  { id: 'porotta_veg', menuGroup: 'Kerala Event', category: 'Main Courses', name: 'Kerala Porotta with Veg Curry', priceCents: 900, active: true, image: 'porotta_veg' },

  { id: 'pork_fry', menuGroup: 'Kerala Event', category: 'Chef Special', name: 'Angamaly-Style Spicy Pork Fry', priceCents: 750, active: true, image: 'pork_fry' },

  { id: 'cutlets', menuGroup: 'Kerala Event', category: 'Snacks', name: 'Chicken Cutlets (2 Pieces)', priceCents: 500, active: true, image: 'kerala_cutlet' },
  { id: 'pazham_pori', menuGroup: 'Kerala Event', category: 'Snacks', name: 'Pazham Pori (Kerala Banana Fritters)', priceCents: 200, active: true, image: 'kerala_pzh' },

  { id: 'kerala_tea', menuGroup: 'Kerala Event', category: 'Beverages', name: 'Indian Tea', priceCents: 200, active: true, image: 'kerala_tea' },
  { id: 'kerala_lassi', menuGroup: 'Kerala Event', category: 'Beverages', name: 'Mango Lassi', priceCents: 350, active: true, image: 'kerala_lassi' },
];

window.POS_MENU_GROUP_ORDER = ['Kerala Event'];
window.POS_CATEGORY_ORDER = {
  'Kerala Event': [
    'Breakfast',
    'Main Courses',
    'Chef Special',
    'Snacks',
    'Beverages',
  ],
};
