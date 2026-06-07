/** Corporate Lunch — POS */
window.FOODEZA_MENU = [
  { id: 'bc', menuGroup: 'Corporate Lunch', category: 'Curry Bowl', name: 'Butter Chicken', priceCents: 850, active: true },
  { id: 'pbm', menuGroup: 'Corporate Lunch', category: 'Curry Bowl', name: 'Paneer Butter Masala (veg)', priceCents: 750, active: true },
  { id: 'dal', menuGroup: 'Corporate Lunch', category: 'Curry Bowl', name: 'Spinach Dal (vegan)', priceCents: 650, active: true },

  { id: 'thali', menuGroup: 'Corporate Lunch', category: 'Special', name: 'Thali', priceCents: 1050, active: true },

  { id: 'lassi', menuGroup: 'Corporate Lunch', category: 'Drinks', name: 'Mango Lassi', priceCents: 300, active: true },
  { id: 'lemonade', menuGroup: 'Corporate Lunch', category: 'Drinks', name: 'Super Cool Lemonade', priceCents: 250, active: true },
];

window.POS_MENU_GROUP_ORDER = ['Corporate Lunch'];
window.POS_CATEGORY_ORDER = {
  'Corporate Lunch': ['Curry Bowl', 'Special', 'Drinks'],
};
