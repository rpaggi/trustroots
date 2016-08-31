(function () {
  'use strict';

  angular
    .module('search')
    .controller('SearchSidebarController', SearchSidebarController);

  /* @ngInject */
  function SearchSidebarController($rootScope, $stateParams, $log, FiltersService, tribe) {

    // ViewModel
    var vm = this;

    vm.onPlaceSearch = onPlaceSearch;
    vm.chosenTribes = [];
    vm.filterByUsersTribes = false;
    vm.filterByUsersTribes = false;
    vm.filters = FiltersService.get();
    vm.onUserTribesFiltersToggle = onUserTribesFiltersToggle;
    vm.clearTribeFilters = clearTribeFilters;
    vm.refreshTribeFilters = refreshTribeFilters;

    // Init search from the URL, `tr-location` directive attached
    // to search input will take care of the rest.
    // `Replacing underscore with space is to make search queries
    // coming from Hitchwiki/Nomadwiki/Trashwiki work
    // @link https://github.com/Hitchwiki/hitchwiki/issues/61
    // @link https://github.com/Trustroots/trustroots/issues/113
    vm.initializeSearch = ($stateParams.location && $stateParams.location !== '') ? $stateParams.location.replace('_', ' ', 'g') : false;

    activate();

    /**
     * Initialize controller
     */
    function activate() {

      if (tribe && tribe._id) {
        $log.log('sidebar found tribe');
        $log.log(tribe);
        // If tribe was requested from URL
        vm.chosenTribes = [tribe];
        vm.filters.tribes = FiltersService.set('tribes', [tribe._id]);
      } else if (vm.filters.tribes && vm.filters.tribes.length > 0) {
        // Where there any tribe filters stored before this controller came to live?
        $log.log('Stored filters detected...');
        $log.log(vm.filters.tribes);
        /*
        var chosenTribes;
        vm.filters.tribes.forEach(function(tribe) {
          chosenTribes.push();
        });
        vm.chosenTribes = chosenTribes;
        */
      }

    }

    /**
     * Broadcast information about changed search location
     */
    function onPlaceSearch(data, type) {
      if (data && type === 'center') {
        $rootScope.$broadcast('search.mapCenter', data);
      } else if (data && type === 'bounds') {
        $rootScope.$broadcast('search.mapBounds', data);
      }
    }


    /**
     * Clear tribe filters and reset the map
     */
    function clearTribeFilters() {
      $log.log('->clearTribeFilters');
      FiltersService.clearTribeFilters();
      vm.chosenTribes = [];
      vm.filters.tribes = [];
      vm.filterByUsersTribes = false;
      $rootScope.$broadcast('search.resetMarkers');
    }

    /**
     * Clear tribe filters and reset the map
     */
    function refreshTribeFilters() {
      $log.log('->refreshTribeFilters');
      if (vm.chosenTribes.length) {
        vm.filterByUsersTribes = false;
        FiltersService.tribesIdsFromTribes(vm.chosenTribes)
          .then(function(tribeIds) {
            $log.log('->onUserTribesFiltersToggle 2');
            $log.log(tribeIds);
            return FiltersService.set('tribes', tribeIds);
          })
          .then(function(tribeFilters) {
            vm.filters.tribes = tribeFilters;
            $rootScope.$broadcast('search.resetMarkers');
          })
          .catch(function(err) {
            $log.error(err);
          });
      } else {
        clearTribeFilters();
      }
    }

    /**
     * Set filters to be similar to the user
     */
    function onUserTribesFiltersToggle() {
      $log.log('->onUserTribesFiltersToggle: ' + vm.filterByUsersTribes);
      $log.log(vm.$resolve.memberships);
      if (vm.filterByUsersTribes) {
        FiltersService.tribesFromMemberships(vm.$resolve.memberships)
          .then(function(tribes) {
            $log.log('->onUserTribesFiltersToggle 1');
            $log.log(tribes);
            vm.chosenTribes = tribes;
            return FiltersService.tribesIdsFromTribes(tribes);
          })
          .then(function(tribeIds) {
            $log.log('->onUserTribesFiltersToggle 2');
            $log.log(tribeIds);
            return FiltersService.set('tribes', tribeIds);
          })
          .then(function(tribeFilters) {
            vm.filters.tribes = tribeFilters;
            $rootScope.$broadcast('search.resetMarkers');
          })
          .catch(function(err) {
            $log.error(err);
          });
      }
    }

  }

}());
