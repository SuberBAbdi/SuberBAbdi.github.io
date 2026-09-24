/* Site stability layer. The CAD renderer itself lives in cad-viewer-fixes.js.
 * This loaded slot is retained for navigation/layout fixes only. */
(function(){
  'use strict';
  const run=()=>{
    const left=document.getElementById('leftSidebar'),center=document.getElementById('centerColumn'),right=document.getElementById('rightSidebar'),detail=document.getElementById('projectDetailView'),feed=document.getElementById('feedView');
    if(!left||!center||!right||!detail||!feed)return;

    if(window.openProject&&!window.__stableOpenWrapped){
      const original=window.openProject;
      window.openProject=function(id){
        detail.classList.remove('closing');detail.style.display='block';detail.classList.add('open');feed.style.display='none';
        right.classList.remove('hidden','opacity-0','pointer-events-none','translate-x-3');
        center.classList.remove('lg:col-span-6','lg:col-span-8','lg:col-span-9','lg:col-span-11');
        if(!left.classList.contains('is-collapsed')&&window.toggleLeftSidebar)window.toggleLeftSidebar();
        original.call(this,id);
        const restore=()=>{detail.style.display='block';detail.classList.add('open');detail.classList.remove('closing');feed.style.display='none';right.classList.add('hidden');right.classList.remove('opacity-0','pointer-events-none','translate-x-3');center.classList.remove('lg:col-span-6','lg:col-span-8','lg:col-span-9');center.classList.add('lg:col-span-11','project-detail-expanded')};
        requestAnimationFrame(restore);setTimeout(restore,260);
      };
      window.__stableOpenWrapped=true;
    }

    if(window.openHomelabPage&&!window.__stableHomeWrapped){
      const original=window.openHomelabPage;
      window.openHomelabPage=function(){original.call(this);const b=document.getElementById('projectDetailBackProjectList');if(b)b.style.display='none'};
      window.__stableHomeWrapped=true;
    }

    const syncLeft=()=>{
      const collapsed=left.classList.contains('is-collapsed'),btn=document.getElementById('leftToggleBtn'),indicator=document.getElementById('leftCollapsedIndicator');
      if(collapsed){if(btn){btn.style.display='none';btn.style.visibility='hidden'}if(indicator){indicator.classList.remove('hidden');indicator.classList.add('visible');indicator.style.display='flex'}center.classList.remove('lg:col-span-6','lg:col-span-9','lg:col-span-11');center.classList.add(detail.classList.contains('open')?'lg:col-span-11':'lg:col-span-8')}
      else{if(btn){btn.style.display='flex';btn.style.visibility='visible'}if(indicator){indicator.classList.add('hidden');indicator.classList.remove('visible')}center.classList.remove('lg:col-span-8','lg:col-span-11');center.classList.add(detail.classList.contains('open')?'lg:col-span-9':'lg:col-span-6')}
    };
    syncLeft();

    const identity=document.querySelector('#leftProfileContent > p');if(identity){identity.style.whiteSpace='normal';identity.style.overflowWrap='anywhere';identity.style.maxWidth='100%'}
    const modalBody=document.getElementById('modalBody');if(modalBody){modalBody.style.paddingBottom='32px';modalBody.querySelectorAll('.modal-section').forEach((el,i)=>{if(i>0)el.style.marginTop='18px'})}
    const tc=document.getElementById('toolchain-container');if(tc){[...tc.children].sort((a,b)=>a.textContent.trim().localeCompare(b.textContent.trim(),undefined,{sensitivity:'base'})).forEach(x=>tc.appendChild(x))}
    const tl=document.getElementById('experienceTimelineSidebar');if(tl){const p=tl.querySelector('p');if(p)p.textContent='Career Timeline'}
    const align=()=>{const t=document.getElementById('experienceTimelineSidebar'),h=document.querySelector('#experienceSection .experience-section-head .scan-header'),home=document.getElementById('homelabSidebarSection');if(!t||!h||window.innerWidth<768)return;if(home)home.style.marginBottom='18px';t.style.transform=`translateY(${h.getBoundingClientRect().top-t.getBoundingClientRect().top}px)`};
    align();window.addEventListener('resize',align,{passive:true});
    const footer=document.querySelector('footer.footer-electronics-wrap');if(footer){footer.style.marginTop='auto';footer.style.paddingBottom='12px'}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('load',()=>setTimeout(run,100));
})();
