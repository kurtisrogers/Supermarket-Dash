/** Search terms used to discover products via store search APIs. */
export const ALPHABET_TERMS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const GROCERY_SEARCH_TERMS = [
  'milk', 'bread', 'butter', 'cheese', 'yogurt', 'cream', 'eggs', 'bacon', 'ham', 'chicken',
  'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'prawns', 'sausages', 'mince', 'steak',
  'rice', 'pasta', 'noodles', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce',
  'ketchup', 'mayonnaise', 'mustard', 'beans', 'soup', 'tinned', 'cereal', 'oats', 'granola',
  'coffee', 'tea', 'juice', 'water', 'squash', 'cola', 'beer', 'wine', 'crisps', 'biscuits',
  'chocolate', 'sweets', 'nuts', 'fruit', 'apple', 'banana', 'orange', 'berries', 'grapes',
  'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'spinach', 'salad', 'peppers', 'mushroom',
  'frozen', 'chips', 'pizza', 'ice cream', 'yoghurt', 'dessert', 'cake', 'flour', 'baking',
  'shampoo', 'soap', 'toothpaste', 'toilet roll', 'kitchen roll', 'washing powder', 'fabric',
  'cleaning', 'bleach', 'nappies', 'baby', 'pet food', 'cat food', 'dog food', 'organic',
  'free from', 'gluten free', 'vegan', 'plant based', 'protein', 'snacks', 'lunch', 'ready meal',
  'curry', 'rice cakes', 'wraps', 'pittas', 'bagels', 'croissant', 'muffin', 'porridge',
  'honey', 'jam', 'marmalade', 'peanut butter', 'nutella', 'spread', 'margarine', 'lactose',
  'semi skimmed', 'whole milk', 'skimmed', 'cheddar', 'mozzarella', 'parmesan', 'brie',
  'heinz', 'kelloggs', 'walkers', 'cadbury', 'nestle', 'hovis', 'warburtons', 'innocent',
  'cathedral city', 'lurpak', 'marmite', 'weetabix', 'pg tips', 'nescafe', 'coca cola',
  'pepsi', 'fanta', 'sprite', 'robinson', 'lucozade', 'red bull', 'monster', 'tropicana',
  'innocent smoothie', 'actimel', 'yakult', 'danone', 'muller', 'activia', 'cat food',
  'dog treats', 'laundry', 'dishwasher', 'surface spray', 'hand wash', 'shower gel', 'deodorant',
  'razor', 'sanitary', 'tissues', 'cotton wool', 'plasters', 'vitamins', 'pain relief',
  'paracetamol', 'ibuprofen', 'cough', 'cold', 'allergy', 'sun cream', 'moisturiser',
];

export const TESCO_DEPARTMENTS = [
  'Fresh Food',
  'Bakery',
  'Frozen Food',
  'Food Cupboard',
  'Drinks',
  'Household',
  'Health & Beauty',
  'Baby & Toddler',
  'Pets',
  'Home & Entertainment',
];

export function allDiscoveryTerms() {
  return [...new Set([...ALPHABET_TERMS, ...GROCERY_SEARCH_TERMS])];
}
