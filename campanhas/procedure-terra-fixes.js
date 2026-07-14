/* Ajustes específicos da passada Terra: sem alterar URLs, âncoras ou a mensagem clínica aprovada. */
(function(){
  var procedure=document.documentElement.getAttribute('data-procedure');
  if(procedure==='lip-lifting'){
    var heroImage=document.querySelector('.hero-media img');
    if(heroImage){heroImage.src='../campanhas/assets/amanda-profissional-hero.webp';heroImage.removeAttribute('srcset');heroImage.width=1080;heroImage.height=1080;}
    document.querySelectorAll('[data-procedure="lip-lifting"][data-track="whatsapp"]').forEach(function(cta,index){
      if(index<2){cta.textContent='Falar com a equipe';}
      if(index===1){cta.setAttribute('data-cta-location','hero');}
    });
    document.querySelectorAll('.procedure-video-card video').forEach(function(video){video.preload='metadata';if(!video.poster)video.poster='../campanhas/assets/conteudos/amanda-atendendo-consulta.webp';});
  }
  if(procedure==='otoplastia'){
    document.querySelectorAll('[data-procedure="otoplastia"][data-track="whatsapp"]').forEach(function(cta,index){
      if(index<2)cta.textContent='Falar com a equipe';
    });
  }
  if(procedure==='ninfoplastia'){
    document.querySelectorAll('[data-procedure="ninfoplastia"][data-track="whatsapp"]').forEach(function(cta,index){
      if(index<2){cta.textContent='Falar com a equipe';}
      if(index===1){cta.setAttribute('data-cta-location','hero');}
    });
  }
  if(procedure==='procedimentos'){
    document.querySelectorAll('[data-procedure="procedimentos"][data-track="whatsapp"]').forEach(function(cta,index){
      if(index===0){cta.textContent='Falar com a equipe';cta.setAttribute('data-cta-location','nav');}
      if(index===1){cta.textContent='Agendar avaliação';cta.setAttribute('data-cta-location','final');}
    });
  }
})();
