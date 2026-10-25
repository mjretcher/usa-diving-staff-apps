// Run: npm i zipcodes@8 d3-geo@3 && node db/scripts/build_clubs_zip.js membership-analytics/boundary-data.json boundary-studio/clubs-zip.json
// Builds boundary-studio/clubs-zip.json: ZIP -> [x, y, state, countyFips]
// x,y = ZIP centroid (zipcodes npm package) projected with the same
// geoAlbersUsa().scale(1300).translate([487.5,305]) the map's paths use.
// County = the county polygon in boundary-data.json containing that point.
const fs=require('fs'), z=require('zipcodes').codes, {geoAlbersUsa}=require('d3-geo');
const proj=geoAlbersUsa().scale(1300).translate([487.5,305]);
const bd=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function polys(d){const out=[];let cur=null;const re=/([MLZ])([^MLZ]*)/gi;let m;
  while((m=re.exec(d))){const c=m[1].toUpperCase();
    if(c==='Z'){if(cur)out.push(cur);cur=null;continue;}
    const nums=m[2].trim().split(/[ ,]+/).filter(Boolean).map(Number);
    if(c==='M'){if(cur)out.push(cur);cur=[];}
    for(let i=0;i+1<nums.length;i+=2)cur.push([nums[i],nums[i+1]]);}
  if(cur)out.push(cur);return out;}
const counties=bd.counties.map(c=>{const P=polys(c.d);let b=[1e9,1e9,-1e9,-1e9];
  P.forEach(p=>p.forEach(([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y)}));return{f:c.f,st:c.st,P,b}});
function inside(pt,P){let c=false;for(const poly of P){for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];
  if(((yi>pt[1])!==(yj>pt[1]))&&(pt[0]<(xj-xi)*(pt[1]-yi)/(yj-yi)+xi))c=!c;}}return c;}
function nearest(pt,st){let best=null,bd2=1e18;for(const c of counties){if(st&&c.st!==st)continue;
  for(const p of c.P)for(const[x,y]of p){const d=(x-pt[0])**2+(y-pt[1])**2;if(d<bd2){bd2=d;best=c}}}return best;}
const out={};let inPoly=0,near=0,off=0;
for(const [k,v] of Object.entries(z)){ if(!/^\d{5}$/.test(k)) continue;
  const p=proj([v.longitude,v.latitude]);
  if(!p){out[k]=[null,null,v.state,null];off++;continue;}
  let hit=counties.find(c=>p[0]>=c.b[0]&&p[0]<=c.b[2]&&p[1]>=c.b[1]&&p[1]<=c.b[3]&&inside(p,c.P));
  if(hit)inPoly++; else {hit=nearest(p,v.state);near++;}
  out[k]=[+p[0].toFixed(1),+p[1].toFixed(1),v.state,hit?hit.f:null];}
// Where boundary-data.json already assigns a ZIP to a county (the Map tab's
// assignment), keep it so the Clubs tab and the Map tab agree.
let kept=0;for(const [f,st] of Object.entries(bd.stats||{}))for(const zz of Object.keys(st.z||{}))if(out[zz]&&out[zz][3]!==f){out[zz][3]=f;kept++;}
console.log('county kept from boundary-data.json for',kept,'ZIPs');
fs.writeFileSync(process.argv[3],JSON.stringify({built:new Date().toISOString().slice(0,10),source:'zipcodes npm package ZIP centroids, projected geoAlbersUsa (scale 1300, translate 487.5,305); county = boundary-data.json polygon containing the point, else nearest county in the same state; where boundary-data.json already assigns a ZIP to a county (the assignment the Map tab uses), that county is kept so both tabs agree',zips:out}));
console.log({total:Object.keys(out).length,inPoly,near,off});
