import unittest
from pathlib import Path
from scripts.importers.pdf_importer import build_pdf_route

class PdfImporterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = build_pdf_route(Path('data/source/rdr2-complete-checklist.pdf'))

    def test_consumes_all_51_pages(self):
        self.assertEqual(len(self.result['pages']), 51)
        self.assertEqual([p['page'] for p in self.result['pages']], list(range(1,52)))

    def test_story_covers_all_chapters_and_american_venom(self):
        story = [m for m in self.result['milestones'] if m['kind']=='story']
        chapters = {m['chapter'] for m in story}
        self.assertEqual(chapters, {
            'chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','chapter-6','epilogue-1','epilogue-2'
        })
        self.assertEqual(story[0]['title'], 'Outlaws from the West')
        self.assertEqual(story[-1]['title'], 'American Venom')

    def test_companion_activities_and_item_requests_are_structured(self):
        activities = [m for m in self.result['milestones'] if m['kind']=='companion_activity']
        requests = [m for m in self.result['milestones'] if m['kind']=='item_request']
        self.assertEqual(len(activities), 14)
        self.assertEqual(len(requests), 22)
        pearson = next(m for m in requests if m['title']=='Rabbit for Pearson')
        self.assertEqual(pearson['availability']['time'], '8am to 12pm')
        self.assertTrue(pearson['missableRisk'])

    def test_stranger_quests_span_source_chapters(self):
        strangers=[m for m in self.result['milestones'] if m['kind']=='stranger']
        self.assertGreaterEqual(len(strangers),30)
        self.assertTrue(any(m['title'].startswith('The American Inferno') for m in strangers))
        self.assertTrue(any(m['title'].startswith('Duchesses and Other Animals') for m in strangers))

if __name__=='__main__': unittest.main()
