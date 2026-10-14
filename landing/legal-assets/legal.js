(function(){var r=document.documentElement,b=document.getElementById("theme");
try{var s=localStorage.getItem("af-theme");if(s)r.setAttribute("data-theme",s);}catch(e){}
function p(){var d=r.getAttribute("data-theme")==="dark";b.textContent=d?"Modo claro":"Modo oscuro";}
b.addEventListener("click",function(){var n=r.getAttribute("data-theme")==="dark"?"light":"dark";r.setAttribute("data-theme",n);try{localStorage.setItem("af-theme",n);}catch(e){}p();});p();})();
