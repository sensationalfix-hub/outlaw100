from __future__ import annotations

import argparse
import json
import re
import subprocess
import unicodedata
from pathlib import Path


def slug(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).encode('ascii','ignore').decode('ascii').lower()
    return re.sub(r'[^a-z0-9]+','-',value).strip('-')


def extract_pages(pdf_path: Path) -> list[dict]:
    proc = subprocess.run(['pdftotext','-layout',str(pdf_path),'-'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    text = proc.stdout.decode('utf-8',errors='replace')
    raw = text.split('\f')
    if raw and not raw[-1].strip(): raw.pop()
    return [{'page':i+1,'text':page.rstrip()} for i,page in enumerate(raw)]


def milestone(kind, chapter, title, page, order, *, missable=False, availability=None, details='', checklist=None, metadata=None):
    return {
        'id': f'milestone:{kind}:{slug(chapter)}:{slug(title)}',
        'kind': kind,
        'chapter': chapter,
        'title': title,
        'order': order,
        'sourcePage': page,
        'sourceReference': f'PDF p.{page}',
        'missableRisk': bool(missable),
        'availability': availability or {},
        'details': details,
        'checklist': checklist or [],
        'metadata': metadata or {},
    }


STORY = {
'chapter-1': (2, [
'Outlaws from the West','Enter, Pursued by a Memory','The Aftermath of Genesis','Old Friends','Who the Hell is Leviticus Cornwall?','Eastward Bound.'
]),
'chapter-2': (2, [
'Polite Society, Valentine Style','Americans at Rest','Who is Not Without Sin?','Exit Pursued by a Bruised Ego','The First Shall Be Last','Paying a Social Call','A Quiet Time','Blessed Are the Meek?','Good, Honest, Snake Oil *','We Loved Once and True I*','We Loved Once and True II*','We Loved Once and True III*','Money Lending and Other Sins I *','Money Lending and Other Sins II *','Money Lending and Other Sins III','The Spines of America','Pouring Forth Oil I *','Pouring Forth Oil II *','Pouring Forth Oil III','Pouring Forth Oil IV','A Fisher of Men','An American Pastoral Scene','The Sheep and the Goats','A Strange Kindness'
]),
'chapter-3': (2, [
'The New South','Further Questions of Female Suffrage','Money Lending and Other Sins IV *','American Distillation','The Course of True Love I *','The Course of True Love II *','The Course of True Love III *','Advertising, the New American Art','Horse Flesh for Dinner','The Fine Joys of Tobacco','Magicians for Sport','Friends in Very Low Places','An Honest Mistake','Preaching Forgiveness as He Went','Sodom? Back to Gomorrah','Blessed Are the Peacemakers','A Short Walk in Pretty Town','Blood Feuds, Ancient and Modern','The Battle of Shady Belle'
]),
'chapter-4': (2, [
'The Joys of Civilization','Angelo Bronte, A Man of Honor','Money Lending and Other Sins V *','Fatherhood and Other Dreams I *','Fatherhood and Other Dreams II *','No, No and Thrice No','The Gilded Cage','A Fine Night of Debauchery','American Fathers I','American Fathers II','Horsemen, Apocalypses','Urban Pleasures','Country Pursuits','Revenge is a Dish Best Eaten','Banking, the Old American Art'
]),
'chapter-5': (3, [
'Welcome to the New World','Savagery Unleashed','A Kind and Benevolent Despot','Hell Hath no Fury','Paradise Mercifully Departed','Dear Uncle Tacitus','Fleeting Joy','A Fork in the Road','That’s Murfree Country'
]),
'chapter-6': (3, [
'Icarus and Friends','Visiting Hours','Just a Social Call','Do Not Seek Absolution I *','Do Not Seek Absolution II *','The Course of True Love IV *','The Course of True Love V *','Money Lending and Other Sins VI *','Money Lending and Other Sins VII *','The Delights of Van Horn','The Bridge to Nowhere','A Rage Unleashed','Archeology for Beginners *','Honor, Amongst Thieves *','The Fine Art of Conversation','Goodbye, Dear Friend','Mrs. Sadie Adler, Widow I *','Mrs. Sadie Adler, Widow II *','Favored Sons','The King’s Son','My Last Boy','Our Best Selves','Red Dead Redemption'
]),
'epilogue-1': (3, [
'The Wheel','Simple Pleasures','Farming, For Beginners','Fatherhood, For Beginners','Old Habits','Jim Milton Rides, Again?','Fatherhood, For Idiots','Motherhood','Gainful Employment','The Landowning Classes','Home of the Gentry'
]),
'epilogue-2': (3, [
'Bare Knuckle Friendships','Home Improvements for Beginners','An Honest Day’s Labors','The Tool Box','A New Jerusalem','A Quick Favor to An Old Friend','Uncle’s Bad Day','Trying Again','A Really Big Bastard','A New Future Imagined','American Venom'
]),
}

STRANGERS = {
'chapter-2': (4,[
('A Better World, A New Friend (2 Parts)','Complete hunting requests.'),('The Noblest of Men, and a Woman (4 Parts)','Hunt down famous gunslingers.'),('All That Glitters','Buy a map from a treasure hunter.'),('American Dreams','Find clues left by a serial killer.'),('The Smell of the Greasepaint (2 Parts)','Help a travelling sideshow.'),('Arcadia for Amateurs (5 Parts)','Help a wildlife photographer.'),('Fundraiser','Donate money for a Memorial Hall.'),('A Fine Night for It','Help a man to get rid of the Night Folk.'),('Geology for Beginners (2 Parts)','Help a time-traveller to find rock carvings.'),('A Test of Faith (2 Parts)','Find dinosaur bones.'),('Smoking and Other Hobbies','Collect cigarette cards.'),('To the Ends of the Earth','Give some plants to a collector')
]),
'chapter-3': (4,[
('He’s British, Of Course (5 Parts)','Help a circus performer to find his animals.'),('A Fisher of Fish (2 Parts)','Mail some legendary fish to a man.'),('The Iniquities of History (2 Parts)','Help a man renew with his past.'),('No Good Deed','Help a doctor get his caravan back.')
]),
'chapter-4': (5,[
('Oh, Brother (3 parts)','Help two brothers in their battle for love.'),('A Bright Bouncing Boy (3 Parts)','Become a professor’s assistant.'),('The Mercies of Knowledge (7 Parts)','Help patent the electric chair.'),('The Artist’s Way (4 Parts)','Make friends with a troublesome French artist.'),('The Ties that Bind Us (3 Parts)','Help a pair of escaped convicts.'),('Help a Brother out','Investigate a shop for a monk in Saint-Denis. *'),('Brothers and Sisters, One and All','Retrieve a stolen crucifix. *'),('Duchesses and Other Animals (6 Parts)','Find fine goods for a hatter.'),('Idealism and Pragmatism for Beginners (3 Parts)','Become the mayor’s goon.')
]),
'chapter-6': (5,[
('The Wisdom of Elders (5 Parts)','Help a cursed village.'),('The Veteran (4 Parts)','Hunt and fish with a veteran.'),('Of Men and Angels (2 Parts)','Talk with Sister Calderon. *'),('The Widow of Willard’s Rest (3 Parts)','Help a widow survive in the woods.')
]),
'epilogue-2': (5,[('The American Inferno, Burnt Out (5 Parts)','Help Evelyn Miller write his book.')]),
}

COMPANION = {
'chapter-2': ['Go hunting with Charles Smith','Rob a Homestead with Javier Escuella (Chez Porter)','Play Five Finger Filet with Lenny Summers'],
'chapter-3': ['Home robbery with Sean McGuire (Lonnie’s Shack)','Go fishing with Javier Escuella','Go fishing with Kieran Duffy','Rob a stagecoach with Bill Williamson *','Rob a stagecoach with Sean McGuire *','Play Five Finger Filet with Micah Bell','Play dominoes with Tilly Jackson'],
'chapter-4': ['Go hunting with Simon Pearson','Rob a stagecoach with Lenny Summers','Rob a stagecoach with Micah Bell','Go rustling with Uncle'],
}

REQUESTS = [
('chapter-2','5$ for Abigail','8am to 8pm','You will only receive honor points',True,''),
('chapter-2','Thimble for Jack','8am to 8pm','He’ll give you a drawing',False,''),
('chapter-2','Comic book for Jack','8am to 8pm','He’ll give you a chocolate bar',False,'complete A Fisher of Men'),
('chapter-2','Oleander for Javier','8am to 8pm','He’ll give you poisoned throwing knives',False,''),
('chapter-2','Fountain pen for Mary-Beth','8am to 8pm','She’ll give you a ring',False,'if you see her write in a book'),
('chapter-2','Naval compass for Pearson','8am to 2pm','He’ll give you a bottle of rum',False,'while playing poker'),
('chapter-2','Kentucky bourbon for Sean','12pm to 6pm','He’ll give you a fire bottle',True,''),
('chapter-2','Necklace for Tilly','8am to 8pm','She’ll give you medicine',False,'while playing dominoes'),
('chapter-3','2x American ginseng for Hosea','8am to 8pm','He’ll give you potent medicine',False,''),
('chapter-3','2x Burdock roots for Kieran','12pm to 6pm','He’ll give you horse medicine',False,''),
('chapter-3','Pocket mirror for Molly','8am to 8pm','She’ll give you a cigar',False,''),
('chapter-3','Harmonica for Sadie','8am to 8pm','She’ll give you gun oil',False,'complete Further Questions of Female Suffrage'),
('chapters-2-3-4','Hair pomade for Bill','8am to 8pm','He’ll give you repeater ammo',False,''),
('chapters-2-3-4','Moonshine for Charles','8am to 8pm','He’ll give you fire arrows',True,''),
('chapters-2-3-4','Oleander for Charles','8am to 8pm','He’ll give you poison arrows',True,''),
('chapters-2-3-4','Pipe for Dutch','8am to 8pm','He’ll give you spurs',True,''),
('chapters-2-3-4','Book for Hosea','8am to 8pm','He’ll give you predator bait',False,'only if he sees you reading'),
('chapters-2-3-4','Pocket watch for Lenny','8pm to 3am','He’ll give you dynamite',True,''),
('chapters-2-3-4','Rabbit for Pearson','8am to 12pm','He’ll give you some nutritious stew',True,''),
('chapters-2-3-4','2x Oregano for Susan','8am to 8pm','She’ll give you a potent miracle tonic',False,''),
('epilogue','Eagle feather for Charles','8am to 8pm','He’ll give you a horse reviver',True,''),
('epilogue','Medicinal cream for Uncle','8am to 8pm','He’ll give you clothes',False,''),
]

BETTER_WORLD_CHECKS = [
'1 perfect rabbit carcass','1 perfect squirrel carcass','1 perfect cardinal carcass','1 perfect rat carcass','1 perfect woodpecker carcass','1 perfect chipmunk carcass','1 perfect opossum carcass','1 perfect oriole carcass','1 perfect robin carcass','1 perfect songbird carcass','1 perfect sparrow carcass','1 perfect toad carcass','1 perfect skunk carcass','1 perfect bullfrog carcass','1 perfect cedar waxwing carcass','1 perfect bat carcass','1 perfect blue jay carcass','1 perfect crow carcass','1 perfect beaver carcass'
]
DUCHESSES_CHECKS = [
'5 little egret plumes','5 reddish egret plumes','5 snowy egret plumes','15 lady of the night orchids','20 heron plumes','7 lady slipper orchids','10 moccasin orchids','25 gator eggs','3 acuna’s star orchids','7 cigar orchids','5 ghost orchids','30 spoonbills plumes','10 rat tail orchids','5 spider orchids','5 night-scented orchids','5 clam-shell orchids','5 queen’s orchids','10 sparrow egg orchids','5 dragon’s mouth orchids'
]


def build_pdf_route(pdf_path: Path) -> dict:
    pages = extract_pages(pdf_path)
    milestones = []
    order = 0
    for chapter,(page,titles) in STORY.items():
        for raw in titles:
            order += 10
            missable = '*' in raw
            title = raw.replace(' *','').replace('*','').strip()
            milestones.append(milestone('story',chapter,title,page,order,missable=missable,availability={'chapter':chapter}))
    for chapter,(page,items) in STRANGERS.items():
        for title,details in items:
            order += 10
            missable = details.rstrip().endswith('*')
            clean_details=details.replace(' *','').strip()
            checks=[]
            if title.startswith('A Better World'): checks=BETTER_WORLD_CHECKS
            if title.startswith('Duchesses and Other Animals'): checks=DUCHESSES_CHECKS
            milestones.append(milestone('stranger',chapter,title,page,order,missable=missable,availability={'chapter':chapter},details=clean_details,checklist=checks))
    for chapter,items in COMPANION.items():
        for raw in items:
            order += 10
            missable='*' in raw
            title=raw.replace(' *','').replace('*','').strip()
            milestones.append(milestone('companion_activity',chapter,title,6,order,missable=missable,availability={'chapter':chapter}))
    for chapter,title,time,reward,missable,req in REQUESTS:
        order += 10
        milestones.append(milestone('item_request',chapter,title,7,order,missable=missable,
            availability={'chapter':chapter,'time':time,'requirement':req},details=reward,metadata={'reward':reward}))

    # Preserve every page verbatim enough for later editorial parsing and audit.
    section_hints = {
        8:'points_of_interest',9:'bounty_hunting',10:'graves',11:'treasures_maps',12:'crafting_upgrades_hunting',
        13:'pamphlets',14:'trapper_crafting',15:'trapper_crafting',16:'trapper_crafting',17:'trapper_crafting',18:'trapper_crafting',
        19:'trapper_crafting',20:'trinkets_talismans',21:'other_completion',22:'special_characters_unique_items',23:'hundred_percent_misc',24:'clothes',
        25:'documents',26:'documents',27:'compendium_cover',28:'legendary_compendium',29:'animals',30:'equipment',31:'fish_gangs',32:'plants',33:'horses',34:'horses',35:'horses',36:'weapons',
        37:'cigarette_cards',38:'cigarette_cards',39:'cigarette_cards',40:'cigarette_cards',41:'cigarette_cards',42:'cigarette_cards',43:'cigarette_cards',44:'cigarette_cards',45:'cigarette_cards',46:'cigarette_cards',47:'cigarette_cards',48:'cigarette_cards',
        49:'challenges',50:'challenges',51:'challenges'
    }
    for p in pages:
        p['sectionHint']=section_hints.get(p['page'],'route' if 2 <= p['page'] <= 7 else 'front_matter')

    audit = {
        'pagesConsumed': len(pages),
        'storyCount': sum(m['kind']=='story' for m in milestones),
        'strangerCount': sum(m['kind']=='stranger' for m in milestones),
        'companionActivityCount': sum(m['kind']=='companion_activity' for m in milestones),
        'itemRequestCount': sum(m['kind']=='item_request' for m in milestones),
        'chapters': sorted({m['chapter'] for m in milestones if m['kind']=='story'}),
        'hasAmericanVenom': any(m['title']=='American Venom' for m in milestones),
    }
    return {'version':1,'pages':pages,'milestones':milestones,'audit':audit}


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('pdf'); ap.add_argument('--out',required=True); args=ap.parse_args()
    result=build_pdf_route(Path(args.pdf))
    out=Path(args.out); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result['audit'],ensure_ascii=False,indent=2))

if __name__=='__main__': main()
