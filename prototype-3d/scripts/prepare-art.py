"""Deterministic, local-only derivation from approved PNGs. Originals are never written."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageStat
import json, hashlib, argparse, io

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'src/assets/hoop'
DEST=ROOT/'src/assets/production'
# Normalized source windows; update these when replacing art with different content/padding.
WINDOWS={
 'leather':('basketball.png',(400/1254,200/1254,100/1254,100/1254)),
 'rimFront':('rim_front.png',(520/1254,512/1254,210/1254,22/1254)),
 'rimBack':('rim_back.png',(520/1254,411/1254,210/1254,22/1254)),
 'net':('net.png',(63/1254,123/1254,1128/1254,947/1254)),
}

def window(image,rect):
 x,y,w,h=rect
 assert 0<=x<1 and 0<=y<1 and w>0 and h>0 and x+w<=1 and y+h<=1
 return image.crop((round(x*image.width),round(y*image.height),round((x+w)*image.width),round((y+h)*image.height)))

def periodic(patch,size):
 # Small, unlit microdetail tile. Four reflected quadrants join without a color seam.
 p=patch.resize((size//2,size//2),Image.Resampling.LANCZOS)
 out=Image.new(p.mode,(size,size));out.paste(p,(0,0));out.paste(ImageOps.mirror(p),(size//2,0))
 out.paste(ImageOps.flip(p),(0,size//2));out.paste(ImageOps.flip(ImageOps.mirror(p)),(size//2,size//2))
 return out

def prepare():
 images={p.name:Image.open(p).convert('RGBA') for p in SOURCE.glob('*.png')}
 for name,im in images.items():
  assert min(im.size)>=256 and im.getchannel('A').getextrema()==(0,255),f'{name}: expected padded RGBA art'
 records={};outputs={}
 def emit(key,image,quality,sources,rects,repeat=(1,1),lossless=False):
  buf=io.BytesIO();image.save(buf,format='WEBP',quality=quality,method=6,lossless=lossless)
  outputs[key+'.webp']=buf.getvalue()
  records[key]={'file':key+'.webp','width':image.width,'height':image.height,'bytes':len(buf.getvalue()),'alpha':image.mode=='RGBA','repeat':repeat,
   'sources':[{'file':name,'width':images[name].width,'height':images[name].height,'crop':rect,'sha256':hashlib.sha256((SOURCE/name).read_bytes()).hexdigest()} for name,rect in zip(sources,rects)]}
 # Board retains its exact painting and alpha border; no baked sprite padding is shipped.
 im=images['backboard.png'];box=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
 crop=(box[0]/im.width,box[1]/im.height,(box[2]-box[0])/im.width,(box[3]-box[1])/im.height)
 board=window(im,crop);board.thumbnail((768,768),Image.Resampling.LANCZOS)
 emit('board',board,92,['backboard.png'],[crop])
 # Remove low-frequency photographic light from a seam-free leather sample.
 name,rect=WINDOWS['leather'];patch=window(images[name],rect).convert('RGB');smooth=patch.filter(ImageFilter.GaussianBlur(7))
 mean=ImageStat.Stat(patch).mean;pixels=[]
 for rgb,base in zip(getattr(patch,"get_flattened_data",patch.getdata)(),getattr(smooth,"get_flattened_data",smooth.getdata)()):
  pixels.append(tuple(round(max(0,min(255,mean[i]*(.55+.45*rgb[i]/max(1,base[i]))))) for i in range(3)))
 patch.putdata(pixels);emit('leather',periodic(patch,256),94,[name],[rect],repeat=(1,1))
 # Both approved rim photos contribute paint detail; one periodic map, one complete torus.
 a=window(images[WINDOWS['rimFront'][0]],WINDOWS['rimFront'][1]).convert('RGB').resize((128,32))
 b=window(images[WINDOWS['rimBack'][0]],WINDOWS['rimBack'][1]).convert('RGB').resize((128,32))
 paint=Image.blend(a,b,.5);emit('rim',periodic(paint,128),94,[WINDOWS[k][0] for k in ('rimFront','rimBack')],[WINDOWS[k][1] for k in ('rimFront','rimBack')],repeat=(8,1))
 # Unproject the tapered net illustration into an open, rectangular cylindrical atlas.
 name,rect=WINDOWS['net'];im=images[name];net=Image.new('RGBA',(512,512))
 for j in range(512):
  t=j/511;half=.45-.18*t;y=(rect[1]+rect[3]*t)*im.height
  row=im.crop((round((.5-half)*im.width),round(y),round((.5+half)*im.width),round(y)+1)).resize((512,1),Image.Resampling.LANCZOS)
  net.paste(row,(0,j))
 # Periodic edge crossfade is confined to the rear seam; source diamond strands remain.
 pix=net.load()
 for y in range(512):
  for x in range(16):
   left=pix[x,y];right=pix[511-x,y];w=(1-x/16)*.5
   pix[x,y]=tuple(round(a*(1-w)+b*w) for a,b in zip(left,right))
   pix[511-x,y]=tuple(round(b*(1-w)+a*w) for a,b in zip(left,right))
 emit('net',net,100,[name],[rect],repeat=(2,1),lossless=True)
 report={'version':1,'sourceBytes':sum((SOURCE/n).stat().st_size for n in images),'productionBytes':sum(len(b) for b in outputs.values()),'assets':records}
 outputs['manifest.json']=(json.dumps(report,indent=2)+'\n').encode()
 return outputs

if __name__=='__main__':
 check=argparse.ArgumentParser();check.add_argument('--check',action='store_true');args=check.parse_args()
 outputs=prepare()
 if args.check:
  for name,data in outputs.items():assert (DEST/name).read_bytes()==data,f'{name} is stale; run assets:build'
 else:
  DEST.mkdir(parents=True,exist_ok=True)
  for name,data in outputs.items():(DEST/name).write_bytes(data)
 report=json.loads(outputs['manifest.json']);print(json.dumps({k:report[k] for k in ('sourceBytes','productionBytes')}))
