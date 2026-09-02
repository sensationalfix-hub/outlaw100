import unittest
from scripts.importers.xlsx_importer import parse_catalog_from_sheets

class XlsxImporterTests(unittest.TestCase):
    def test_animals_keep_granular_applicable_criteria(self):
        sheets = {
            'Animals': [
                ['ANIMALS', None, None, 'TRACKED', 'KILLED', 'SKINNED', 'STUDIED', 'COMPLETION', 'LOCATIONS'],
                [None]*9,
                ['TOTAL', None, None, None, None, None, None, 0, None],
                ['B', 'American Badger', None, None, None, None, None, 0, 'Ringneck Creek'],
                [None, 'Little Brown Bat', None, '-', None, None, None, 0, 'Bayou Nwa'],
            ]
        }
        result = parse_catalog_from_sheets(sheets)
        badger = next(e for e in result['entities'] if e['name'] == 'American Badger')
        badger_keys = {c['key'] for c in result['criteria'] if c['entityId'] == badger['id']}
        self.assertEqual(badger_keys, {'tracked','killed','skinned','studied'})
        bat = next(e for e in result['entities'] if e['name'] == 'Little Brown Bat')
        bat_keys = {c['key'] for c in result['criteria'] if c['entityId'] == bat['id']}
        self.assertEqual(bat_keys, {'killed','skinned','studied'})

    def test_crafting_keeps_material_requirements_separate_from_crafted_criterion(self):
        sheets = {
            'Satchels': [
                ['SATCHELS','CRAFTED','LEGENDARY',None,'LARGE'],
                [None,None,'Alligator','Beaver','Deer'],
                ['Tonics',None,0,0,1],
                ['Materials',None,0,0,1],
            ]
        }
        result = parse_catalog_from_sheets(sheets)
        tonics = next(e for e in result['entities'] if e['name'] == 'Tonics Satchel')
        crit = [c for c in result['criteria'] if c['entityId'] == tonics['id']]
        self.assertEqual([c['key'] for c in crit], ['crafted'])
        recipe = next(r for r in result['recipes'] if r['entityId'] == tonics['id'])
        self.assertEqual(len(recipe['requirements']), 1)
        self.assertEqual(recipe['requirements'][0]['quantity'], 1)
        self.assertEqual(recipe['requirements'][0]['materialName'], 'Deer')

    def test_sheet_audit_reports_all_expected_sheets(self):
        expected = ['Hunting','Outfits (Legendary)','Outfits (Normal)','Clothing','Saddles','Satchels','Camp','PROGRESS','Animals','Fish','Plants','Horses','Weapons','Equipment','Cigarette Cards']
        result = parse_catalog_from_sheets({name: [] for name in expected})
        self.assertEqual(result['audit']['visitedSheets'], expected)

if __name__ == '__main__':
    unittest.main()

class GroupedRowsTests(unittest.TestCase):
    def test_grouped_animals_fish_and_orchids_use_third_or_second_name_column(self):
        sheets = {
            'Animals': [
                ['ANIMALS',None,None,'TRACKED','KILLED','SKINNED','STUDIED','COMPLETION','LOCATIONS'],
                [None]*9,[None]*9,
                [None,'BEARS','American Black Bear',None,None,None,None,0,'woods'],
                ['LEGENDARIES',None,'Legendary Beaver',None,None,None,None,0,'clue'],
            ],
            'Fish': [
                ['FISH',None,'CAUGHT','BAITED','SURVIVALIST 10','COMPLETION','BAIT','LOCATIONS','WEATHER'],
                [None]*9,[None]*9,
                ['LEGENDARIES','Legendary Bluegill',None,'-','-',0,'special','lake','rain'],
            ],
            'Plants': [
                ['PLANTS',None,'PICKED','TASTED','RECIPE','CIG CARD','HERBALIST 9','COMPLETION'],
                [None]*8,[None]*8,
                ['ORCHIDS',"Acuna's Star Orchid",None,'-','-','-',None,0],
            ],
        }
        result = parse_catalog_from_sheets(sheets)
        names = {e['name'] for e in result['entities']}
        self.assertIn('American Black Bear', names)
        self.assertIn('Legendary Beaver', names)
        self.assertIn('Legendary Bluegill', names)
        self.assertIn("Acuna's Star Orchid", names)

class CanonicalXlsxIdentityTests(unittest.TestCase):
    def test_satchel_recipe_reuses_equipment_entity(self):
        sheets = {
            'Equipment': [
                ['EQUIPMENT',None,'OBTAINED','COMPLETION',None,None,None,'LOCATIONS'],
                [None]*8,[None]*8,
                ['SATCHELS','Tonics Satchel',None,0,None,None,None,'Pearson'],
            ],
            'Satchels': [
                ['SATCHELS','CRAFTED','LEGENDARY',None,'LARGE'],
                [None,None,'Alligator','Beaver','Deer'],
                ['Tonics',None,0,0,1],
            ],
        }
        result = parse_catalog_from_sheets(sheets)
        matching = [e for e in result['entities'] if e['name'] == 'Tonics Satchel']
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]['category'], 'satchel')
        keys = {c['key'] for c in result['criteria'] if c['entityId'] == matching[0]['id']}
        self.assertEqual(keys, {'obtained','crafted'})
