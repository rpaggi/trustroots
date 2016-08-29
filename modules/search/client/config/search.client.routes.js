(function () {
  'use strict';

  angular
    .module('search')
    .config(SearchRoutes);

  /* @ngInject */
  function SearchRoutes($stateProvider) {

    $stateProvider.
      state('search', {
        url: '/search?location?offer',
        templateUrl: '/modules/search/views/search.client.view.html',
        requiresAuth: true,
        footerHidden: true,
        controller: 'SearchController',
        controllerAs: 'search',
        resolve: {
          // A string value resolves to a service
          SettingsService: 'SettingsService',
          appSettings: function(SettingsService) {
            return SettingsService.get();
          },

          // A string value resolves to a service
          TribesService: 'TribesService',
          tribes: function(TribesService) {
            return TribesService.query();
          },

          // A string value resolves to a service
          UserProfilesService: 'UserProfilesService',
          profile: function(UserProfilesService, Authentication) {
            return UserProfilesService.get({
              username: Authentication.user.username
            });
          }
        },
        data: {
          pageTitle: 'Search'
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
