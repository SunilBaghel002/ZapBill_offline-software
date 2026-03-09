function dispatchOrderTest() {
  const items = [
    { id: '1', item_name: 'Paneer Tikka', category_id: 'cat-tandoor', menu_item_id: '1' },
    { id: '2', item_name: 'Veg Burger', category_id: 'cat-kitchen', menu_item_id: '2' },
    { id: '3', item_name: 'Cold Coffee', category_id: 'cat-bar', menu_item_id: '3' }
  ];

  const categoryMap = [
    { category_id: 'cat-tandoor', station_id: 'st-tandoor', station_name: 'Tandoor', printer_name: 'Kitchen_Printer' },
    { category_id: 'cat-kitchen', station_id: 'st-kitchen', station_name: 'Kitchen', printer_name: 'Kitchen_Printer' },
    { category_id: 'cat-bar', station_id: 'st-bar', station_name: 'Bar', printer_name: 'Kitchen_Printer' }
  ];

  const excludedItemIds = [];
  const defaultKotPrinter = 'Kitchen_Printer';
  const enrichedOrder = { id: 'order1' };

  console.log("=== START ROUTING ===");

  const kitchenItems = items.filter(item => {
    const itemId = item.menu_item_id || item.id;
    return !excludedItemIds.includes(itemId);
  });

  const allJobPromises = [];
  const results = { kots: [], errors: [] };

  if (kitchenItems.length > 0) {
    const stationGroups = new Map();
    const UNMAPPED_KEY = '__unmapped_default__';

    for (const item of kitchenItems) {
      const itemCatId = String(item.category_id);
      const mappings = categoryMap.filter(m => String(m.category_id) === itemCatId);
      
      console.log(`[DISPATCH] Item "${item.item_name}" cat_id="${itemCatId}" -> ${mappings.length} station mapping(s)`);

      if (mappings.length > 0) {
        for (const mapping of mappings) {
          const key = mapping.station_id || mapping.station_name;
          console.log(`[DISPATCH]   -> Station: "${mapping.station_name}" (id=${mapping.station_id}) printer="${mapping.printer_name}"`);
          if (!stationGroups.has(key)) {
            stationGroups.set(key, {
              name: mapping.station_name,
              printer: mapping.printer_name,
              items: []
            });
          }
          stationGroups.get(key).items.push(item);
        }
      } else {
        console.log(`[DISPATCH]   -> No mapping, using default`);
        if (!stationGroups.has(UNMAPPED_KEY)) {
          stationGroups.set(UNMAPPED_KEY, {
            name: null,
            printer: defaultKotPrinter,
            items: []
          });
        }
        stationGroups.get(UNMAPPED_KEY).items.push(item);
      }
    }

    console.log(`[DISPATCH] Station groups formed: ${stationGroups.size}`);

    for (const [key, group] of stationGroups.entries()) {
      const printerToUse = group.printer;
      console.log(`[DISPATCH] Enqueuing KOT for station "${group.name}" with ${group.items.length} items to printer "${printerToUse}"`);
      results.kots.push({ type: 'KOT', printer: printerToUse, station: group.name, items: group.items });
    }
  }

  console.log("=== RESULTS ===");
  console.log(JSON.stringify(results.kots, null, 2));
}

dispatchOrderTest();
