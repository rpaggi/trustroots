(function () {
  'use strict';

  angular
    .module('search')
    .config(SearchRoutes);

  /* @ngInject */
  function SearchRoutes($stateProvider) {

    $stateProvider.
      state('search', {
        url: '/search?location?offer?tribe',
        templateUrl: '/modules/search/views/search.client.view.html',
        abstract: true,
        requiresAuth: true,
        footerHidden: true,
        controller: 'SearchController',
        controllerAs: 'search',
        resolve: {
          // A string value resolves to a service
          TribesService: 'TribesService',
          tribes: function(TribesService) {
            return TribesService.query();
          },

          // A string value resolves to a service
          OffersService: 'OffersService',
          offer: function($stateParams, OffersService) {
            if ($stateParams.offer && $stateParams.offer.length === 24) {
              return OffersService.get({
                offerId: $stateParams.offer
              });
            } else {
              return false;
            }
          }

        },
        data: {
          pageTitle: 'Search'
        }
      }).
      state('search.map', {
        url: '',
        requiresAuth: true,
        footerHidden: true,
        data: {
          pageTitle: 'Search'
        },
        views: {
          'map': {
            templateUrl: '/modules/search/views/search-map.client.view.html',
            controller: 'SearchMapController',
            controllerAs: 'searchMap'
          },
          'sidebar': {
            templateUrl: '/modules/search/views/search-sidebar.client.view.html',
            controller: 'SearchSidebarController',
            controllerAs: 'searchSidebar',
            resolve: {
              // A string value resolves to a service
              UserMembershipsService: 'UserMembershipsService',
              memberships: function(UserMembershipsService) {
                return UserMembershipsService.query({
                  type: 'tribe'
                });
              },

              // A string value resolves to a service
              TribeService: 'TribeService',
              tribe: function(TribeService, $log, $stateParams) {
                $log.log('tribe service route');
                if ($stateParams.tribe && $stateParams.tribe.length) {
                  $log.log('get tribe ' + $stateParams.tribe);
                  return TribeService.get({
                    tribeSlug: $stateParams.tribe
                  });
                } else {
                  $log.log('no tribe');
                  return false;
                }
              }
            }
          }
        }
      }).
      state('search-signin', {
        url: '/search?location?offer',
        templateUrl: '/modules/search/views/search-signin.client.view.html',
        requiresAuth: false,
        footerHidden: true,
        controller: 'SearchSignupController',
        controllerAs: 'searchSignup',
        data: {
          pageTitle: 'Search'
        }
      });
  }

}());
