(function () {
  'use strict';

  /**
   * Service for handing filters
   */
  angular
    .module('core')
    .factory('FiltersService', FiltersService);

  /* @ngInject */
  function FiltersService($q, $log, Authentication) {

    var filters = {
      tribes: []
    };

    // Make cache id unique for this user
    var cachePrefix = (Authentication.user) ? 'search.filters.' + Authentication.user._id : 'search.filters';

    $log.log(cachePrefix);

    var service = {
      set: set,
      get: get,
      clearTribeFilters: clearTribeFilters,
      tribesIdsFromTribes: tribesIdsFromTribes,
      tribesFromMemberships: tribesFromMemberships,
      cacheFilters: cacheFilters
    };

    return service;


    /**
     * Get an array of tribe objects from an array of user membersip objects
     * Returns a promise
     */
    function tribesFromMemberships(memberships) {
      $log.log('->filters->tribesFromMemberships');
      return $q(function(resolve) {
        var tribes = [];
        if (memberships && memberships.length) {
          angular.forEach(memberships, function(membership) {
            // If it's tribe, not tag, add it to the filter
            if (membership.tag.tribe) {
              tribes.push(membership.tag);
            }
          });
        }
        resolve(tribes);
      });
    }

    /**
     * Get an array of tribe id's from an array of tribe objects
     * Returns a promise
     */
    function tribesIdsFromTribes(tribesList) {
      $log.log('->filters->tribesIdsFromTribes `tribesList.length`: ' + tribesList.length);
      return $q(function(resolve) {
        var tribeIds = [];
        if (tribesList.length) {
          $log.log('->filters->tribesIdsFromTribes -> going to loop');
          angular.forEach(tribesList, function(tribe) {
            $log.log('->filters->tribesIdsFromTribes -> for each');
            if (tribe._id) tribeIds.push(tribe._id);
          });
        }
        $log.log('->filters->tribesIdsFromTribes `tribeIds`:');
        $log.log(tribeIds);
        resolve(tribeIds);
      });
    }

    /**
     * Clear tribe filters
     * Returns a promise
     */
    function clearTribeFilters() {
      $log.log('->filters->clearTribeFilters');
      filters.tribes = [];
      return get('tribes');
    }

    /**
     * Get filter(s)
     *
     * @param filter String Filter name to receive. If undefined, will return all filters.
     */
    function get(filter) {
      $log.log('->filters->get');
      return $q(function(resolve, reject) {
        // Single filter
        if (filter && angular.isString(filter)) {
          if (angular.isDefined(filters[filter])) {
            resolve(filters[filter]);
          } else {
            reject('Requested filter does not exist.');
          }
        } else {
          // All filters
          resolve(filters);
        }
      });
    }

    function cacheFilters() {
      $log.log('->filters->cacheFilters');
      $log.log('Caching filters');
    }

    /**
     * Set filter
     */
    function set(filter, content) {
      $log.log('->filters->set');
      filters[filter] = content;
      return get(filter);
    }

  }

}());
