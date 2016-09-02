(function () {
  'use strict';

  angular
    .module('search')
    .controller('SearchController', SearchController);

  /* @ngInject */
  function SearchController($scope, tribes, offer, Authentication) {

    // ViewModel
    var vm = this;

    // Exposed to the view
    vm.tribes = tribes || [];
    vm.offer = offer || false;
    vm.isSidebarOpen = Authentication.user && Authentication.user.public;

    // SearchMap controller sends these signals down
    $scope.$on('search.loadingOffer', function() {
      vm.offer = false;
      vm.loadingOffer = true;
    });
    $scope.$on('search.previewOffer', function(event, offer) {
      vm.offer = offer;
      vm.loadingOffer = false;
    });
    $scope.$on('search.closeOffer', function() {
      vm.offer = false;
    });
    $scope.$on('search.resetMarkers', function() {
      if (vm.offer) {
        vm.offer = false;
        $scope.$broadcast('search.closeOffer');
      }
    });

  }

}());
