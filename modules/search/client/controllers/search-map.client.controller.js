(function () {
  'use strict';

  angular
    .module('search')
    .controller('SearchMapController', SearchMapController);

  /* @ngInject */
  function SearchMapController($log, $scope, $stateParams, $timeout, $analytics, OffersService, Authentication, leafletData, messageCenterService, MapLayersFactory, SearchMapService, FiltersService) {

    // `search-map-canvas` is id of <leaflet> element
    var mapId = 'search-map-canvas';

    // Prefix for Leaflet events
    // @link https://github.com/angular-ui/ui-leaflet/commit/d22b3f0
    var listenerPrefix = 'leafletDirectiveMap.' + mapId;

    // ViewModel
    var vm = this;

    // Exposed to the view
    vm.pruneCluster = new PruneClusterForLeaflet(60, 60);
    vm.mapLayerstyle = 'street';
    vm.notFound = false;
    vm.mapCenter = false;
    vm.currentSelection = {
      weight: 2,
      color: '#989898',
      fillColor: '#b1b1b1',
      fillOpacity: 0.5,
      latlngs: { lat: 0, lng: 0 },
      radius: 500, // Meters
      type: 'circle',
      layer: 'selectedOffers',
      clickable: false
    };
    vm.mapMinimumZoom = 4;
    vm.mapBounds = {};
    vm.mapLayers = {
      baselayers: MapLayersFactory.getLayers({ streets: true, satellite: true, outdoors: true }),
      overlays: {
        selectedOffers: {
          name: 'Selected hosts',
          type: 'group',
          visible: false
        }
      }
    };
    vm.mapDefaults = {
      attributionControl: false, // Adding this manually below
      keyboard: true,
      worldCopyJump: true,
      zoomControlPosition: 'bottomright',
      controls: {
        scale: true,
        layers: {
          visible: true,
          position: 'bottomleft',
          collapsed: true
        }
      }
    };
    vm.mapPaths = {
      selected: vm.currentSelection
    };
    /**
     * Catch map events:
     * click, dblclick, mousedown, mouseup, mouseover, mouseout, mousemove, contextmenu, focus, blur,
     * preclick, load, unload, viewreset, movestart, move, moveend, dragstart, drag, dragend, zoomstart,
     * zoomend, zoomlevelschange, resize, autopanstart, layeradd, layerremove, baselayerchange, overlayadd,
     * overlayremove, locationfound, locationerror, popupopen, popupclose
     */
    vm.mapEvents = {
      map: {
        enable: ['click', 'moveend', 'load', 'baselayerchange'],
        logic: 'emit'
      }
    };
    vm.mapLastBounds = {
      northEastLng: 0,
      northEastLat: 0,
      southWestLng: 0,
      southWestLat: 0
    };

    // Init
    activate();

    /**
     * Initialize controller
     */
    function activate() {

      // Set map's initial location
      SearchMapService.getMapCenter().then(function(mapCenter) {
        vm.mapCenter = mapCenter;
      });

      // Add attribution controller
      leafletData.getMap(mapId).then(function(map) {
        map.addControl(L.control.attribution({
          position: 'bottomright',
          prefix: ''
        }));
      });

      // Set Leaflet listeners
      $scope.$on(listenerPrefix + '.baselayerchange', onBaseLayerChange);
      $scope.$on(listenerPrefix + '.load', onLeafletLoad);
      $scope.$on(listenerPrefix + '.moveend', onLeafletMoveEnd);
      $scope.$on(listenerPrefix + '.click', closeOffer);

      // If offer gets closed elsewhere
      $scope.$on('search.closeOffer', function() {
        $log.log('->search.map ->search.closeOffer');
        vm.mapLayers.overlays.selectedOffers.visible = false;
      });

      // Listen to new map location values
      $scope.$on('search.mapCenter', function(event, mapCenter) {
        vm.mapCenter = mapCenter;
      });
      $scope.$on('search.mapBounds', function(event, mapBounds) {
        vm.mapBounds = mapBounds;
      });

      // Listen to other controllers
      $scope.$on('search.resetMarkers', resetMarkers);

      // Setting up the marker and click event
      vm.pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
        $log.log('->PrepareLeafletMarker');
        $log.log(data);
        leafletMarker.on('click', function() {
          $log.log('onClickMarker:');
          $log.log(data.userId);
          $scope.$emit('search.loadingOffer');
          OffersService
            .get({ offerId: data.userId })
            .$promise
            .then(function(offer) {
              previewOffer(offer);
            })
            .catch(function() {
              messageCenterService.add('danger', 'Sorry, something went wrong. Please try again.');
            });
        });
        leafletMarker.setIcon(data.icon);
      };

      // Initializing either location search or offer
      if ($stateParams.offer) {
        // Center map to the offer, if there is one
        if (vm.$resolve.offer) {
          previewOffer(vm.$resolve.offer);
        } else {
          // Offer not found or other error
          messageCenterService.add('danger', 'Sorry, we did not find what you are looking for.');
          $analytics.eventTrack('offer-not-found', {
            category: 'search.map',
            label: 'Offer not found'
          });
        }
      }

    }

    /**
     * Open hosting offer
     */
    function previewOffer(offer) {
      if (offer.location) {
        // Let parent controller handle setting this to scope
        $scope.$emit('search.previewOffer', offer);

        vm.currentSelection.latlngs = offer.location;
        vm.mapLayers.overlays.selectedOffers.visible = true;
        vm.isSidebarOpen = true;
        vm.mapCenter = {
          lat: offer.location[0],
          lng: offer.location[1],
          zoom: 13
        };
        $analytics.eventTrack('offer.preview', {
          category: 'search.map',
          label: 'Preview offer'
        });
      }
    }


    /**
     * Close hosting offer
     */
    function closeOffer() {
      vm.mapLayers.overlays.selectedOffers.visible = false;
      $scope.$emit('search.closeOffer');
    }

    /**
     * Return constructed icon
     * @link http://leafletjs.com/reference.html#icon
     */
    function markerIcon(status) {
      status = (status === 'yes') ? 'yes' : 'maybe';
      return L.icon({
        iconUrl: '/modules/core/img/map/marker-icon-' + status + '.svg',
        iconSize: [20, 20], // size of the icon
        iconAnchor: [10, 10] // point of the icon which will correspond to marker's location
      });
    }

    /**
     * Force refresh markers on map
     */
    function resetMarkers() {
      $log.log('->resetMarkers');
      getMarkers(true);
    }

    /**
     * Load markers to the current bounding box
     */
    function getMarkers(forcedRefresh) {
      $log.log('->getMarkers: ' + forcedRefresh);

      // Don't proceed if:
      // - Map does not have bounds set (typically at map init these might be missing for some milliseconds)
      // - If user isn't public(confirmed) yet - no need to hit API just to get 401
      if (!vm.mapBounds.northEast || !Authentication.user.public) return;

      // If we get out of the boundig box of the last api query we have to call the API for the new markers
      if (forcedRefresh ||
          vm.mapBounds.northEast.lng > vm.mapLastBounds.northEastLng ||
          vm.mapBounds.northEast.lat > vm.mapLastBounds.northEastLat ||
          vm.mapBounds.southWest.lng < vm.mapLastBounds.southWestLng ||
          vm.mapBounds.southWest.lat < vm.mapLastBounds.southWestLat) {

        // We add a margin to the boundings depending on the zoom level
        var boundingDelta = 10 / vm.mapCenter.zoom;

        // Saving the current bounding box amd zoom
        vm.mapLastBounds = {
          northEastLng: vm.mapBounds.northEast.lng + boundingDelta,
          northEastLat: vm.mapBounds.northEast.lat + boundingDelta,
          southWestLng: vm.mapBounds.southWest.lng - boundingDelta,
          southWestLat: vm.mapBounds.southWest.lat - boundingDelta
        };

        vm.lastZoom = vm.mapCenter.zoom;

        FiltersService
          .get()
          .then(function(filters) {
            $log.log('->getMarkers -> FiltersService.get() ->');
            $log.log(filters);
            // API Call
            OffersService.query({
              northEastLng: vm.mapLastBounds.northEastLng,
              northEastLat: vm.mapLastBounds.northEastLat,
              southWestLng: vm.mapLastBounds.southWestLng,
              southWestLat: vm.mapLastBounds.southWestLat,
              filters: filters
            }, function(offers) {

              // Remove last markers
              // eslint-disable-next-line new-cap
              vm.pruneCluster.RemoveMarkers();

              // Let's go through those markers
              // This loop might look weird but it's actually speed optimized :P
              for (var i = -1, len = offers.length; ++i < len;) {
                var marker = new PruneCluster.Marker(
                  offers[i].locationFuzzy[0],
                  offers[i].locationFuzzy[1]
                );
                marker.data.icon = markerIcon(offers[i].status);
                marker.data.userId = offers[i]._id;
                // Register markers
                // eslint-disable-next-line new-cap
                vm.pruneCluster.RegisterMarker(marker);
              }

              // Update markers
              // eslint-disable-next-line new-cap
              vm.pruneCluster.ProcessView();
            });
          });
      }
    }

    /**
     * When Leaflet map has loaded
     */
    function onLeafletLoad() {
      leafletData.getMap(mapId).then(function(map) {
        map.addLayer(vm.pruneCluster);
      });

      // If the zoom is big enough we wait for the map to be loaded with timeout and we get the markers
      if (vm.mapCenter.zoom > vm.mapMinimumZoom) {
        var loadMarkers = function() {
          if (angular.isDefined(vm.mapBounds.northEast)) {
            getMarkers();
          } else {
            // $timeout does $apply for us
            $timeout(loadMarkers, 10);
          }
        };
        // $timeout does $apply for us
        $timeout(loadMarkers, 10);
      }
    }

    /**
     * When moving the map has ended
     */
    function onLeafletMoveEnd() {
      if (vm.mapCenter.zoom > vm.mapMinimumZoom) {
        getMarkers();
      } else {
        // Otherwise hide the markers...

        /* eslint-disable new-cap */
        vm.pruneCluster.RemoveMarkers();
        vm.pruneCluster.ProcessView();
        /* eslint-enable new-cap */

        vm.mapLastBounds = {
          northEastLng: 0,
          northEastLat: 0,
          southWestLng: 0,
          southWestLat: 0
        };
      }

      SearchMapService.cacheMapCenter(vm.mapCenter);
    }

    /**
     * When Leaflet base layer changes
     */
    function onBaseLayerChange(event, layer) {
      $analytics.eventTrack('baselayerchange', {
        category: 'search.map',
        label: layer.leafletEvent.name
      });
      // Determine currently selected baselayer style 'TRStyle' has to be
      // set when defining layers. Possible values are: street, satellite
      // Defaults to street
      $timeout(function() {
        vm.mapLayerstyle = (layer.leafletEvent.layer.options.TRStyle) ? layer.leafletEvent.layer.options.TRStyle : 'streets';
      });
    }

  }

}());
