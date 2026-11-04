/* Navegação entre os módulos por hash: #/contratos, #/curriculos/candidato, #/curriculos/empresa */
(function () {
  'use strict';

  function rotear() {
    const [, modulo, sub] = (location.hash || '#/contratos').split('/');
    const curriculos = modulo === 'curriculos';
    document.querySelector('#modulo-contratos').classList.toggle('is-hidden', curriculos);
    document.querySelector('#modulo-curriculos').classList.toggle('is-hidden', !curriculos);
    document.querySelectorAll('.mainnav__item').forEach(a =>
      a.classList.toggle('is-active', a.dataset.modulo === (curriculos ? 'curriculos' : 'contratos')));
    if (curriculos) window.Curriculos.mostrar(sub === 'empresa' ? 'empresa' : 'candidato');
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', rotear);
  rotear();
})();
