(function () {
  'use strict';

  angular
    .module('search')
    .controller('SearchController', SearchController);

  /* @ngInject */
  function SearchController($scope, $log, tribes, offer) {

    // ViewModel
    var vm = this;

    // Exposed to the view
    vm.tribes = tribes || [];
    vm.offer = offer || false;
    vm.isSidebarOpen = true;

    // Listen to other controllers
    $scope.$on('search.openOffer', function(event, offer) {
      vm.offer = offer;
    });

    $scope.$on('search.closeOffer', function() {
      vm.offer = false;
    });

  }

}());
