export const people = [
  { id:'liming', name:'Li Ming', age:76, relation:'Dad', room:'Sunshine House · 302', initials:'L', color:'lavender', note:'Knee pain; needs company on walks. Does not like chicken.', conditions:'Alzheimer’s disease · Type 2 diabetes', caregiver:'Liu Li' },
  { id:'jianguo', name:'Liu Jianguo', age:72, relation:'Uncle', room:'Sunshine House · 305', initials:'L', color:'lime', note:'Enjoys calligraphy and music. Prefers light meals.', conditions:'Hypertension', caregiver:'Allen Wang' },
  { id:'guihong', name:'Gu Hong', age:70, relation:'Aunt', room:'Garden House · 201', initials:'G', color:'peach', note:'Enjoys painting and flower arranging. Joins afternoon activities.', conditions:'Arthritis', caregiver:'Liu Li' },
  { id:'yangbin', name:'Yang Bin', age:74, relation:'Aunt', room:'Garden House · 203', initials:'Y', color:'lavender', note:'Enjoys knitting and meeting friends. Prefers quiet mornings.', conditions:'Requires support with mobility', caregiver:'Liu Li' },
];
export const activities = [
  {id:'garden',title:'A little garden of our own',category:'Planting',time:'15:00',duration:'45 min',place:'Sunshine Garden',description:'Meet the herbs and care for a little plant with our gardening host. Tools are provided and you can take part while seated.',icon:'plant'},
  {id:'art',title:'A visit to the exhibition',category:'Exhibition',time:'14:00',duration:'60 min',place:'Community Gallery',description:'Explore paintings and sculpture with our gallery host. Seated breaks are available throughout the visit.',icon:'art'},
  {id:'music',title:'An afternoon of familiar songs',category:'Music',time:'16:00',duration:'30 min',place:'Music Corner, 1st floor',description:'Listen to familiar melodies and share a memory. You are welcome to sing along or simply listen.',icon:'music'},
  {id:'restaurant',title:'Restaurant volunteer',category:'Volunteer',time:'11:00',duration:'45 min',place:'Restaurant, 1st floor',description:'Help set the tables and welcome guests. A caregiver will confirm suitable tasks after registration. No hot food handling is involved.',icon:'food'},
];
export function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
export function seedRecords(date:string) {
  return [
    ...[{time:'07:30',title:'Wake up and wash',category:'Daily care',person:'liming',done:true},{time:'08:00',title:'Breakfast',category:'Meals',person:'liming',done:true},{time:'09:00',title:'Morning health check',category:'Care',person:'liming',done:false},{time:'10:00',title:'Garden walk',category:'Activities',person:'liming',done:false},{time:'11:30',title:'Lunch',category:'Meals',person:'liming',done:false},{time:'15:00',title:'Garden time',category:'Activities',person:'liming',done:false}].map((x,i)=>({id:'seed-task-'+date+'-'+i,kind:'task',content:{...x,date}})),
    {id:'seed-post-1',kind:'post',content:{title:'Dad’s little garden is growing',text:'We watered the plants together today. Dad says he will have a little pot of mint ready for our next visit.',author:'Emma Li',photo:'garden',likes:0}},
    {id:'seed-post-2',kind:'post',content:{title:'A little colour, a big smile',text:'Li Ming finished his first watercolour today and was smiling all afternoon.',author:'Anna Chen',photo:'art',likes:0}},
    {id:'seed-msg-1',kind:'message',content:{text:'Good morning! Li Ming is feeling well today and has already had breakfast.',sender:'Anna Chen',role:'caregiver',thread:'care',time:'08:12'}},
    {id:'seed-msg-2',kind:'message',content:{text:'Thank you. I will come and see Dad this afternoon.',sender:'Emma Li',role:'family',thread:'care',time:'08:18'}},
    {id:'seed-msg-3',kind:'message',content:{text:'Lovely. See you in the sunshine garden this afternoon.',sender:'Li Ming',role:'senior',thread:'dad',time:'08:32'}},
    {id:'seed-plant',kind:'plant',content:{name:'My bird of paradise',watered:null,fertilized:null}},
  ];
}
