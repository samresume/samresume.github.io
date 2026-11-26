/* Shared behaviour for every page: footer year + recognition tabs. */
var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
document.querySelectorAll(".tabs .chip").forEach(function(b){
  b.addEventListener("click", function(){
    document.querySelectorAll(".tabs .chip").forEach(function(x){ x.classList.remove("is-active"); x.setAttribute("aria-selected","false"); });
    document.querySelectorAll(".panel").forEach(function(x){ x.classList.remove("is-active"); });
    b.classList.add("is-active"); b.setAttribute("aria-selected","true");
    document.querySelector('.panel[data-p="'+b.dataset.t+'"]').classList.add("is-active");
  });
});
