(function() {
	
	/** VERTEX POINTS **/
	var findLattices = (function() {
		function distance(x, y) {
			return Math.pow(x, 2) + Math.pow(y, 2);
		}
		
		function generate_n2(radius) {
	
		    var ymax = [0];
		    var d = 0;
		    
		    var points = [];
		    
		    var batch, x, y;
		    
		    while (d <= radius) {
		        yieldable = []
		        
		        while (true) {
				    batch = [];
				    for (x = 0; x < d+1; x++) {
				        y = ymax[x];
				        if (distance(x, y) <= Math.pow(d, 2)) {
				            batch.push({x: x, y: y});
				            ymax[x] += 1;
			            }
			        }
				    if (batch.length === 0) {
				        break;
			        }
			        points = points.concat(batch);
			    }
		        
		        d += .1
		        ymax.push(0);
	        }
	        
	        return points;
			
		};
		
		return function findLattices(radius, origin) {
			var all_points = [];
			
			var i, point, points = generate_n2(radius);
			for (i = 0; i < points.length; i++) {
				point = points[i];
				
				all_points.push(point);
				if (point.x !== 0) {
					all_points.push({x: -point.x, y: point.y});
				}
				if (point.y !== 0) {
					all_points.push({x: point.x, y: -point.y});
				}
				if (point.x && point.y) {
					all_points.push({x: -point.x, y: -point.y});
				}
			}
			
			for (i = 0; i < all_points.length; i++) {
				all_points[i].x += origin.x;
				all_points[i].y += origin.y;
			};
			
			return all_points;
		}
		
	})();
	
	/** CONFIG **/
	var plots_x = 49;
	var plots_y = 49;
	var map_quality = 1;
	var water_quality = 1;
	
	var textures = {
		ground: THREE.ImageUtils.loadTexture('textures_ground.png'),
		sky: THREE.ImageUtils.loadTexture('texture_sky_clouds.jpg')
	}
	
	var TerrainBuilder = {
		
		utils: {
			getFaceCount: function( tile_type ) {
				switch( tile_type ) {
					case 0:
					case 2:
						return Math.max(1, map_quality - 3);
						break;
					case 1:
						return Math.pow(2, map_quality);
						break;
					case 3:
						return Math.pow(2, water_quality);
				}
			},
			
			mergeEdge: function( edge, to ) {
				var vertex_step, edge_position, vertex_index, vertex_offset, height_delta, i;
				
				vertex_step = (to.length-1) / (edge.length-1);
				
				for (i = 0; i < edge.length; i++) {
					
					edge_position = vertex_step * i;
					vertex_index = Math.floor(edge_position);
					
					if (i !== edge.length - 1) {
						vertex_offset = edge_position - vertex_index;
					} else {
						vertex_offset = 0;
					}
					
					if (vertex_offset === 0) {
						edge[i] = to[vertex_index];
					} else {
						height_delta = to[vertex_index] - to[vertex_index+1];
						edge[i] = to[vertex_index] - (height_delta * vertex_offset);
					}
					
				}
				
				return edge;
				
			},
			
			mergeEdges: function( heightmap, neighbors ) {
				
				var my_faces, my_edge, neighbor_faces, neighbor_edge, i;
				
				my_faces = Math.sqrt(heightmap.length) - 1;
				
				// Adjust for corners
				if (neighbors[0].type !== -1 && neighbors[0].state !== 0) { // Top
					heightmap[ 0 ] = neighbors[0].cache.heightmap[ (Math.sqrt(neighbors[0].cache.heightmap.length)-1) * Math.sqrt(neighbors[0].cache.heightmap.length) ]; // Top-Left
					heightmap[ my_faces ] = neighbors[0].cache.heightmap[ neighbors[0].cache.heightmap.length - 1 ]; // Top-Right
				}
				
				if (neighbors[1].type !== -1 && neighbors[1].state !== 0) { // Right
					heightmap[ my_faces ] = neighbors[1].cache.heightmap[ 0 ]; // Top-Right
					heightmap[ heightmap.length - 1 ] = neighbors[1].cache.heightmap[ (Math.sqrt(neighbors[1].cache.heightmap.length)-1) * Math.sqrt(neighbors[1].cache.heightmap.length) ]; // Bottom-Right
				}
				
				if (neighbors[2].type !== -1 && neighbors[2].state !== 0) { // Bottom
					heightmap[ my_faces * (my_faces+1) ] = neighbors[2].cache.heightmap[ 0 ]; // Bottom-Left
					heightmap[ heightmap.length - 1 ] = neighbors[2].cache.heightmap[ Math.sqrt( neighbors[2].cache.heightmap.length ) - 1 ]; // Bottom-Right
				}
				
				if (neighbors[3].type !== -1 && neighbors[3].state !== 0) { // Left
					heightmap[ 0 ] = neighbors[3].cache.heightmap[ Math.sqrt(neighbors[3].cache.heightmap.length) - 1 ]; // Top-Left
					heightmap[ my_faces * (my_faces+1) ] = neighbors[3].cache.heightmap[ neighbors[3].cache.heightmap.length - 1 ]; // Bottom-Left
				}
				
				// Top-Left
				if (neighbors[4].type !== -1 && neighbors[4].state !== 0) {
					heightmap[ 0 ] = neighbors[4].cache.heightmap[ neighbors[4].cache.heightmap.length - 1 ];
				}
				// Top-Right
				if (neighbors[5].type !== -1 && neighbors[5].state !== 0) {
					heightmap[ my_faces ] = neighbors[5].cache.heightmap[ Math.sqrt(neighbors[5].cache.heightmap.length) * (Math.sqrt(neighbors[5].cache.heightmap.length) - 1) ];
				}
				// Bottom-Right
				if (neighbors[6].type !== -1 && neighbors[6].state !== 0) {
					heightmap[ heightmap.length - 1 ] = neighbors[6].cache.heightmap[ 0 ];
				}
				// Bottom-Left
				if (neighbors[7].type !== -1 && neighbors[7].state !== 0) {
					heightmap[ my_faces * (my_faces+1) ] = neighbors[7].cache.heightmap[ Math.sqrt(neighbors[7].cache.heightmap.length) - 1 ];
				}
				
				// Top neighbor
				neighbor_faces = TerrainBuilder.utils.getFaceCount(neighbors[0].type);
				my_edge = [];
				for (i = 0; i <= my_faces; i++) {
					my_edge.push( heightmap[i] );
				}
				if (neighbors[0].state > 0) {
					neighbor_edge = [];
					for (i = 0; i <= neighbor_faces; i++) {
						neighbor_edge.push( neighbors[0].cache.heightmap[ neighbors[0].cache.heightmap.length - 1 - (neighbor_faces) + i ] );
					}
					
					TerrainBuilder.utils.mergeEdge( my_edge, neighbor_edge );
					for (i = 0; i <= my_faces; i++) {
						heightmap[i] = my_edge[i];
					}
					
				}
				if (neighbors[0].state === 0 && my_faces > neighbor_faces) {
					// We have more vertices than our neighbor will, we need to stay smooth
					
					TerrainBuilder.utils.mergeEdge(
						my_edge,
						TerrainBuilder.utils.mergeEdge(
							new Array(neighbor_faces+1),
							my_edge
						)
					);
					
					for (i = 0; i <= my_faces; i++) {
						heightmap[i] = my_edge[i];
					}
					
				}
				
				
				// Right neighbor
				neighbor_faces = TerrainBuilder.utils.getFaceCount(neighbors[1].type);
				my_edge = [];
				for (i = 0; i <= my_faces; i++) {
					my_edge.push( heightmap[ (i * (my_faces+1)) + my_faces ] );
				}
				if (neighbors[1].state > 0) {
					neighbor_edge = [];
					for (i = 0; i <= neighbor_faces; i++) {
						neighbor_edge.push( neighbors[1].cache.heightmap[ i * (neighbor_faces+1) ] );
					}
					
					TerrainBuilder.utils.mergeEdge( my_edge, neighbor_edge );
					for (i = 0; i <= my_faces; i++) {
						heightmap[ (i * (my_faces+1)) + my_faces ] = my_edge[i];
					}
					
				}
				if (neighbors[1].state === 0 && my_faces > neighbor_faces) {
					// We have more vertices than our neighbor will, we need to stay smooth
					
					TerrainBuilder.utils.mergeEdge(
						my_edge,
						TerrainBuilder.utils.mergeEdge(
							new Array(neighbor_faces+1),
							my_edge
						)
					);
					
					
					for (i = 0; i <= my_faces; i++) {
						heightmap[ (i * (my_faces+1)) + my_faces ] = my_edge[i];
					}
					
				}
				
				// Bottom neighbor
				neighbor_faces = TerrainBuilder.utils.getFaceCount(neighbors[2].type);
				my_edge = [];
				
				for (i = 0; i <= my_faces; i++) {
					my_edge.push( heightmap[ heightmap.length - 1 - my_faces + i ] );
				}
				if (neighbors[2].state > 0) {
					neighbor_edge = [];
					for (i = 0; i <= neighbor_faces; i++) {
						neighbor_edge.push( neighbors[2].cache.heightmap[i] );
					}
					
					TerrainBuilder.utils.mergeEdge( my_edge, neighbor_edge );
					for (i = 0; i <= my_faces; i++) {
						heightmap[ heightmap.length - 1 - my_faces + i ] = my_edge[i];
					}
					
				}
				if (neighbors[2].state === 0 && my_faces > neighbor_faces) {
					// We have more vertices than our neighbor will, we need to stay smooth
					
					TerrainBuilder.utils.mergeEdge(
						my_edge,
						TerrainBuilder.utils.mergeEdge(
							new Array(neighbor_faces+1),
							my_edge
						)
					);
					
					for (i = 0; i <= my_faces; i++) {
						heightmap[ heightmap.length - 1 - my_faces + i ] = my_edge[i];
					}
				}
				
				
				// Left neighbor
				neighbor_faces = TerrainBuilder.utils.getFaceCount(neighbors[3].type);
				my_edge = [];
				
				for (i = 0; i <= my_faces; i++) {;
					my_edge.push( heightmap[ i * (my_faces+1) ] );
				}
				if (neighbors[3].state > 0) {
					neighbor_edge = [];
					for (i = 0; i <= neighbor_faces; i++) {
						neighbor_edge.push( neighbors[3].cache.heightmap[ (i * (neighbor_faces+1)) + neighbor_faces ] );
					}
					
					TerrainBuilder.utils.mergeEdge( my_edge, neighbor_edge );
					for (i = 0; i <= my_faces; i++) {
						heightmap[ i * (my_faces+1) ] = my_edge[i];
					}
					
				}
				if (neighbors[3].state === 0 && my_faces > neighbor_faces) {
					// We have more vertices than our neighbor will, we need to stay smooth
					TerrainBuilder.utils.mergeEdge(
						my_edge,
						TerrainBuilder.utils.mergeEdge(
							new Array(neighbor_faces+1),
							my_edge
						)
					);
					
					for (i = 0; i <= my_faces; i++) {
						heightmap[ i * (my_faces+1) ] = my_edge[i];
					}
				}
				
				return heightmap;
				
			}
		},
		
		Mountain: function() {
			
			var faces = TerrainBuilder.utils.getFaceCount(TileTypes.MOUNTAINS);
			var heightmap = [];
			
			var perlin = new Perlin();
			perlin.seed = Math.random() * 100;
			perlin.lacunarity = 2;
			perlin.persistance = 1;
			var noise_map = new NoiseMapBuilderPlane(perlin, faces + 1, faces + 1).build().map;
			
			for (var i = 0; i < noise_map.length; i++) {
				heightmap[i] = (noise_map[i] > 0) ? noise_map[i] * .3 : noise_map[i] * -.1;
			}
			
			return heightmap;
		},
		
		Ocean: function(tile) {
			
			var faces = TerrainBuilder.utils.getFaceCount(TileTypes.OCEAN)
			var heightmap = [];
			
			var perlin = new Perlin();
			perlin.seed = Math.random() * 100;
			var noise_map = new NoiseMapBuilderPlane(perlin, faces + 1, faces + 1).build().map;
			
			for (var x = 0; x <= faces; x++) {
				for (var y = 0; y <= faces; y++) {
					
					heightmap[x + ((faces+1) * y)] = 0;
					
					if (x === 0 && y === 0 && tile.cache.neighbors[4].type !== TileTypes.OCEAN) { // Top Left
					} else if (x === faces && y === 0 && tile.cache.neighbors[5].type !== TileTypes.OCEAN) { // Top Right
					} else if (x === faces && y == faces && tile.cache.neighbors[6].type !== TileTypes.OCEAN) { // Bottom Right
					} else if (x === 0 && y == faces && tile.cache.neighbors[7].type !== TileTypes.OCEAN) { // Bottom Left
					} else if (y === 0 && tile.cache.neighbors[0].type !== TileTypes.OCEAN) { // Top
					} else if (x === faces && tile.cache.neighbors[1].type !== TileTypes.OCEAN) { // Right
					} else if (y === faces && tile.cache.neighbors[2].type !== TileTypes.OCEAN) { // Bottom
					} else if (x === 0 && tile.cache.neighbors[3].type !== TileTypes.OCEAN) { // Left
					} else {
						
						var distance;
						
						if (y <= faces / 2 && tile.cache.neighbors[0].type === TileTypes.OCEAN) { // Water to the top
							
							if (
								(x <= faces / 2 && (tile.cache.neighbors[3].type === TileTypes.OCEAN)) // If we are in left quad and left to us is water OR to the top-left is water
							) {
									distance = .5;
							} else if (
								x >= faces / 2 && (tile.cache.neighbors[1].type === TileTypes.OCEAN) // or we are in right quad and right to us is water OR to the top-right is water
							) {
									distance = .5;
							} else {
								distance = .5 - Math.abs((x / faces) - .5);
							}
							
						} else if (y >= faces / 2 && tile.cache.neighbors[2].type === TileTypes.OCEAN) { // Water to the bottom
							
							if (
								(x <= faces / 2 && (tile.cache.neighbors[3].type === TileTypes.OCEAN)) // If we are in left quad and left to us is water OR to the bottom-left is water
							) {
									distance = .5;
							} else if (
								x >= faces / 2 && (tile.cache.neighbors[1].type === TileTypes.OCEAN) // or we are in right quad and right to us is water OR to the bottom-right is water
							) {
									distance = .5;
							} else {
								distance = .5 - Math.abs((x / faces) - .5);
							}
							
						} else if (x <= faces / 2 && tile.cache.neighbors[3].type === TileTypes.OCEAN) { // Water to the left
							
							if (
								(y <= faces / 2 && (tile.cache.neighbors[0].type === TileTypes.OCEAN)) // If we are in top quad and above us is water OR to the top-left is water
							) {
									distance = .5;
							} else if (
								y >= faces / 2 && (tile.cache.neighbors[2].type === TileTypes.OCEAN) // or we are in bottom quad and below us is water OR to the bottom-left is water
							) {
									distance = .5;
							} else {
								distance = .5 - Math.abs((y / faces) - .5);
							}
							
						} else if (x >= faces / 2 && tile.cache.neighbors[1].type === TileTypes.OCEAN) { // Water to the right
							
							if (
								(y <= faces / 2 && (tile.cache.neighbors[0].type === TileTypes.OCEAN)) // If we are in top quad and above us is water OR to the top-right is water
							) {
									distance = .5;
							} else if (
								y >= faces / 2 && (tile.cache.neighbors[2].type === TileTypes.OCEAN) // or we are in bottom quad and below us is water OR to the bottom-right is water
							) {
									distance = .5;
							} else {
								distance = .5 - Math.abs((y / faces) - .5);
							}
							
						} else { // This is the easy one, no rules apply, we are a^2 + b^2 = c^2 distance from the edge.
							
							distance = .5 - Math.sqrt(Math.pow(.5 - (x / faces), 2.0) + Math.pow(.5 - (y / faces), 2.0));
							
						}
						
						// Adjust terrain height
						if (
							y === 0 // Top
							||
							x === faces // Right
							||
							y === faces // Bottom
							||
							x === 0 // Left
						) {
							heightmap[x + ((faces+1) * y)] = distance * -.4;
						} else {
							heightmap[x + ((faces+1) * y)] = distance * -.4 + (noise_map[y + ((faces+1) * x)] * .2);
						}
						if (heightmap[x + ((faces+1) * y)] > 0.0) {
							heightmap[x + ((faces+1) * y)] *= .05;
						}
						
					}
					
				}
			}
			
			return heightmap;
		},
		
		Base: function() {
			
			var faces = TerrainBuilder.utils.getFaceCount(TileTypes.PLAINS)
			var heightmap = [];
			
			var perlin = new Perlin();
			perlin.seed = Math.random() * 100;
			perlin.quality = NoiseMap.QUALITY_FAST;
			var noise_map = new NoiseMapBuilderPlane(perlin, faces + 1, faces + 1).build().map;
			
			for (var i = 0; i < noise_map.length; i++) {
				heightmap[i] = (noise_map[i] > 0) ? noise_map[i] * .1 : 0;
			}
			
			return heightmap;
		}
		
	};
	
	var TileTypes = {
		PLAINS: 0,
		MOUNTAINS: 1,
		SNOW: 2,
		OCEAN: 3
	}
	
	var Tile = function(coordinates) {
		this.coordinates = coordinates;
		this.state = 0; // 0 = no tile, 1 = tile placed, 2 = tile explored but hidden
		this.type = Math.floor(Math.random() * 4);
		this.mesh = null;
		
		this.cache = {};
		
		this.hidden = { type: 'i', value: 0 };
	
		this.create = function create() {
			if (typeof this.cache.neighbors === 'undefined') {
				this.cache.neighbors = [];
				this.cache.neighbors.push(this.coordinates.y > 0 ? window.map.grid[this.coordinates.x][this.coordinates.y - 1] : {type: -1}); // top
				this.cache.neighbors.push(this.coordinates.x < plots_x-1 ? window.map.grid[this.coordinates.x + 1][this.coordinates.y] : {type: -1}); // right
				this.cache.neighbors.push(this.coordinates.y < plots_y-1 ? window.map.grid[this.coordinates.x][this.coordinates.y + 1] : {type: -1}); // bottom
				this.cache.neighbors.push(this.coordinates.x > 0 ? window.map.grid[this.coordinates.x - 1][this.coordinates.y] : {type: -1}); // left
				
				this.cache.neighbors.push(this.coordinates.y > 0 && this.coordinates.x > 0 ? window.map.grid[this.coordinates.x - 1][this.coordinates.y - 1] : {type: -1}); // top left
				this.cache.neighbors.push(this.coordinates.y > 0 && this.coordinates.x < plots_x-1 ? window.map.grid[this.coordinates.x + 1][this.coordinates.y - 1] : {type: -1}); // top right
				this.cache.neighbors.push(this.coordinates.y < plots_y-1 && this.coordinates.x < plots_x-1 ? window.map.grid[this.coordinates.x + 1][this.coordinates.y + 1] : {type: -1}); // bottom right
				this.cache.neighbors.push(this.coordinates.y < plots_y-1 && this.coordinates.x > 0 ? window.map.grid[this.coordinates.x - 1][this.coordinates.y + 1] : {type: -1}); // bottom left
			}
			
			if (typeof this.cache.seed === 'undefined') {
				this.cache.seed = { type: 'f', value: Math.floor(Math.random() * 100000) };
			}
			
			switch (this.type) {
				
				case TileTypes.MOUNTAINS:
					var geometry = new THREE.PlaneGeometry( 1, 1, TerrainBuilder.utils.getFaceCount(TileTypes.MOUNTAINS), TerrainBuilder.utils.getFaceCount(TileTypes.MOUNTAINS) );
					
					if (typeof this.cache.heightmap === 'undefined') {
						
						this.cache.heightmap = TerrainBuilder.Mountain(this);
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					} else {
						
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					}
					
					break;
					
				case TileTypes.OCEAN:
					
					var geometry = new THREE.PlaneGeometry( 1, 1, TerrainBuilder.utils.getFaceCount(TileTypes.OCEAN), TerrainBuilder.utils.getFaceCount(TileTypes.OCEAN) );
					
					if (typeof this.cache.heightmap === 'undefined') {
						
						this.cache.heightmap = TerrainBuilder.Ocean(this);
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					} else {
						
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					}
					
					break;
				
				default:
					var geometry = new THREE.PlaneGeometry( 1, 1, TerrainBuilder.utils.getFaceCount(this.type), TerrainBuilder.utils.getFaceCount(this.type) );
					
					if (typeof this.cache.heightmap === 'undefined') {
						
						this.cache.heightmap = TerrainBuilder.Base(this);
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					} else {
						
						for (var i = 0; i < geometry.vertices.length; i++) {
							geometry.vertices[i].position.z = this.cache.heightmap[i];
						}
						
					}
					break;
				
			}
			
			this.cache.heightmap = TerrainBuilder.utils.mergeEdges(this.cache.heightmap, this.cache.neighbors);
			for (var i = 0; i < geometry.vertices.length; i++) {
				geometry.vertices[i].position.z = this.cache.heightmap[i];
			}
			
			var texture;
			if (this.type === TileTypes.PLAINS) {
				texture = textures.plains;
			} else if (this.type === TileTypes.MOUNTAINS) {
				texture = textures.mountains;
			} else if (this.type === TileTypes.SNOW) {
				texture = textures.snow;
			} else if (this.type === TileTypes.OCEAN) {
				texture = textures.ocean;
			}
			
			this.mesh = new THREE.Mesh(
				geometry,
				new THREE.MeshShaderMaterial({
					uniforms: {
						seed: this.cache.seed,
						type: { type: 'f', value: this.type },
						hidden: this.hidden,
						texture: { type: 't', value: 0, texture: texture },
						textures: { type: 't', value: 5, texture: textures.ground },
						neighbors: { type: 'fv1', value: [this.cache.neighbors[0].type, this.cache.neighbors[1].type, this.cache.neighbors[2].type, this.cache.neighbors[3].type, this.cache.neighbors[4].type, this.cache.neighbors[5].type, this.cache.neighbors[6].type, this.cache.neighbors[7].type] }
					},
					vertexShader: document.getElementById( 'groundVertexShader' ).textContent,
					fragmentShader: document.getElementById( 'groundFragmentShader' ).textContent
				})
			);
			this.mesh.rotation.x = Degrees2Radians(-90);
			
			
			if (this.type === TileTypes.OCEAN) {
				this.mesh.water = new THREE.Mesh(
					new THREE.PlaneGeometry(1, 1, TerrainBuilder.utils.getFaceCount(TileTypes.OCEAN), TerrainBuilder.utils.getFaceCount(TileTypes.OCEAN)),
					new THREE.MeshShaderMaterial({
						uniforms: {
							sky_texture: { type: 't', value: 0, texture: textures.sky },
							hidden: this.hidden,
							time: window.map.time_uniform,
						},
						attributes: {
							heightmap: { type: 'f', value: [] }
						},
						vertexShader: document.getElementById( 'waterVertexShader' ).textContent,
						fragmentShader: document.getElementById( 'waterFragmentShader' ).textContent,
						transparent: true
					})
				);
				
				for (var i = 0; i <= this.mesh.water.geometry.vertices.length; i++) {
					this.mesh.water.materials[0].attributes.heightmap.value.push( this.cache.heightmap[i] );
				}
				
				this.mesh.water.matrixAutoUpdate = false;;
				this.mesh.addChild(this.mesh.water);
			}
			
			
			
			return this.mesh;
		}
		
		this.remove = function(scene) {
			this.state = 2;
			
			scene.removeChild(this.mesh);
			
			this.mesh.water = null;
			delete this.mesh.water;
			
			this.mesh = null;
			delete this.mesh;
		};
	}
	
	var is_init = false;
	mapinit = function() {
		if (is_init) return false;
		is_init = true;
		map_quality = +document.getElementById('map_quality').value;
		water_quality = +document.getElementById('water_quality').value;
		
		var renderer = new THREE.WebGLRenderer({antialias: true});
		renderer.sortObjects = false;
		renderer.setSize(1024, 768);
		document.getElementById('viewport').appendChild(renderer.domElement);
		
		var projector = new THREE.Projector();
		
		var scene = new THREE.Scene();
		
		var camera = new THREE.Camera(
			50,
			1024 / 768,
			.1,
			10000
		);
		
		// Create the land
		var map = {
			visible_tiles: [],
			grid: [],
			time_uniform: { type: 'f', value: 0 },
			
			fogify: function() {
				for (var x = 0; x < this.grid.length; x++) {
					for (var y = 0; y < this.grid[x].length; y++) {
						if (this.grid[x][y].state === 1) {
							this.grid[x][y].hidden.value = 1;
						}
					}
				}
			},
			
			reveal: function(coordinates) {
				if (coordinates.x >= 0 && coordinates.x < plots_x && coordinates.y >= 0 && coordinates.y < plots_y) {
					if (map.grid[coordinates.x][coordinates.y].state === 0) {
						var tile = map.grid[coordinates.x][coordinates.y];
						var mesh = tile.create();
						mesh.position.set(coordinates.x, 0, coordinates.y);
						mesh.matrixAutoUpdate = false;
						mesh.updateMatrix();
						scene.addChild(mesh);
						
						tile.state = 1;
						map.visible_tiles.push(map.grid[coordinates.x][coordinates.y]);
					} else {
						map.grid[coordinates.x][coordinates.y].hidden.value = 0;
					}
				}
			},
			
			revealLOS: function(coordinates) {
				var visible_tiles = findLattices(1.6, coordinates);
				var tile_coordinates;
				while (tile_coordinates = visible_tiles.pop()) {
					this.reveal(tile_coordinates);
				}
			},
			
			screen: function(remove) {
				var screen_bounds = {
					from: {
						x: marker.position.x - 8,
						y: marker.position.y - 8,
					},
					to: {
						x: marker.position.x + 1,
						y: marker.position.y + 1,
					}
				};
				if (screen_bounds.from.x < 0) screen_bounds.from.x = 0;
				if (screen_bounds.to.x > plots_x-1) screen_bounds.to.x = plots_x-1;
				if (screen_bounds.from.y < 0) screen_bounds.from.y = 0;
				if (screen_bounds.to.y > plots_y-1) screen_bounds.to.y = plots_y-1;
				
				if (remove) {	
					// Hide tiles
					var tile;
					for (var i = 0; i < this.visible_tiles.length; i++) {
						tile = this.visible_tiles[i];
						if (tile.coordinates.x < screen_bounds.from.x || tile.coordinates.x > screen_bounds.to.x || tile.coordinates.y < screen_bounds.from.y || tile.coordinates.y > screen_bounds.to.y) {
							tile.remove(scene);
							this.visible_tiles.splice(i--, 1);
						}
					}
				}
				
				// Show tiles
				var mesh;
				for (var x = screen_bounds.from.x; x <= screen_bounds.to.x; x++) {
					for (var y = screen_bounds.from.y; y <= screen_bounds.to.y; y++) {
						if (this.grid[x][y].state === 2) {
							mesh = this.grid[x][y].create();
							mesh.position.set(x, 0, y);
							scene.addChild(mesh);
							
							this.grid[x][y].state = 1;
							map.visible_tiles.push(map.grid[x][y]);
						}
					}
				}
			}
		};
		
		for (var x = 0; x < plots_x; x++) {
			map.grid[x] = [];
			for (var y = 0; y < plots_y; y++) {
				map.grid[x][y] = new Tile({x: x, y: y});
			}
		};
		window.map = map;
		
		// User marker
		var marker = {
			position: {x: Math.floor(plots_x / 2), y: Math.floor(plots_y / 2)},
			move: function(x, y) {
				this.position.x += x;
				if (this.position.x < 0) {
					this.position.x = 0;
				} else if (this.position.x > plots_x - 1) {
					this.position.x = plots_x - 1;
				}
				
				this.position.y += y;
				if (this.position.y < 0) {
					this.position.y = 0;
				} else if (this.position.y > plots_y - 1) {
					this.position.y = plots_y - 1;
				}
				
				this.mesh.position.x = this.position.x;
				this.mesh.position.z = this.position.y;
				map.fogify();
				map.revealLOS(this.position);
				
				camera.target.position.set(this.position.x, 0, this.position.y);
				camera.position.set(this.position.x + 1.2, 1.2, this.position.y + 1.2);
			},
			mesh: new THREE.Mesh(
				new THREE.CubeGeometry( .2, .5, .2 ),
				new THREE.MeshNormalMaterial({transparent: true, opacity: .0})
			)
		};
		marker.mesh.position.set(Math.floor(plots_x / 2), .15, Math.floor(plots_y / 2));
		scene.addChild(marker.mesh);
		marker.move(0, 0);
		
		/** KEYBOARD **/
		window.onkeydown = function onkeydown(e) {
			switch (e.keyCode) {
				case 37:
					marker.move(-1, 0);
					break;
				case 38:
					marker.move(0, -1);
					break;
				case 39:
					marker.move(1, 0);
					break;
				case 40:
					marker.move(0, 1);
					break;
			}
		};
		
		var render = function render() {
			renderer.render(scene, camera);
		};
		
		var main = function main() {
			
			window.map.time_uniform.value = new Date().getTime() % 1000000;
			
			render();
			map.screen(true);
			stats.update();
			
			window.requestAnimFrame(main);
			
		};
		
		stats = new Stats();
		stats.domElement.style.position = 'absolute';
		stats.domElement.style.top = '0';
		stats.domElement.style.zIndex = 100;
		document.body.appendChild(stats.domElement);
		
		document.getElementById('viewport').style.display = 'block';
		
		requestAnimFrame(main);
	}

})();