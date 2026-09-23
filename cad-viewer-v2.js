/* CAD viewer compatibility/navigation layer.
 * Deliberately does NOT replace OrbitControls and does NOT create a second ViewCube.
 * The site's native Fusion-style ViewCube in index.html owns faces/edges/corners.
 */
(function(){
  'use strict';
  const STYLE_ID='cad-fusion-v3-css';

  function addCss(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      /* Never create/stack a second cube over the native ViewCube. */
      .cad-fusion-v3-cube{display:none!important;pointer-events:none!important;}
      [id$="ViewerContainer"] .cad-final-toolbar{top:10px!important;right:10px!important;z-index:1000!important;}
      [id$="ViewerContainer"] .cad-final-layers{z-index:1100!important;}
      [id$="ViewerContainer"] .cad-final-shield{z-index:150!important;}
      [id$="ViewerContainer"]:fullscreen .cad-final-toolbar{top:14px!important;right:14px!important;}
    `;
    document.head.appendChild(s);
  }

  function hideProjectListButtonWhenNotInProject(){
    const detail=document.getElementById('projectDetailView');
    const feed=document.getElementById('feedView');
    const btn=document.getElementById('projectDetailBackProjectList');
    if(!btn) return;
    if(feed && getComputedStyle(feed).display!=='none') btn.style.setProperty('display','none','important');
    else if(!detail || !detail.classList.contains('open')) btn.style.setProperty('display','none','important');
  }

  function navigation(){
    hideProjectListButtonWhenNotInProject();
    if(!window.__cadOpenProjectWrapped && typeof window.openProject==='function'){
      const original=window.openProject;
      window.openProject=function(){
        const shell=document.getElementById('projectDetailView');
        if(shell){shell.classList.remove('closing');}
        const result=original.apply(this,arguments);
        setTimeout(()=>{
          document.querySelectorAll('[id$="ViewerContainer"]').forEach(c=>window.dispatchEvent(new Event('cadviewer:refresh')));
          hideProjectListButtonWhenNotInProject();
        },80);
        return result;
      };
      window.__cadOpenProjectWrapped=true;
    }
    if(!window.__cadCloseProjectWrapped && typeof window.closeProject==='function'){
      const original=window.closeProject;
      window.closeProject=function(){
        const result=original.apply(this,arguments);
        setTimeout(hideProjectListButtonWhenNotInProject,80);
        return result;
      };
      window.__cadCloseProjectWrapped=true;
    }
    if(!window.__cadHomelabWrapped && typeof window.openHomelabPage==='function'){
      const original=window.openHomelabPage;
      window.openHomelabPage=function(){
        const result=original.apply(this,arguments);
        setTimeout(()=>document.getElementById('projectDetailBackProjectList')?.style.setProperty('display','none','important'),0);
        return result;
      };
      window.__cadHomelabWrapped=true;
    }
  }

  function pass(){addCss();navigation();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',pass,{once:true});
  else pass();
  window.addEventListener('load',()=>{pass();setTimeout(pass,250);setTimeout(pass,900);},{passive:true});
  window.addEventListener('cadviewer:refresh',pass,{passive:true});
})();
