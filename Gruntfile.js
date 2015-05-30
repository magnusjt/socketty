module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            js: {
                "src": [
                    "client/terminal.js",
                    "client/client.js"
                ],
                "dest": "dist/socketty.js"
            }
            /*
            css: {
                "src": [
                    "client/socketty.css"
                ],
                "dest": "dist/socketty.css"
            }
            */
        },
        uglify: {
            app: {
                options: {
                    mangle: false,
                    compress: true
                },
                files: {
                    "dist/socketty.min.js": "dist/socketty.js"
                }
            }
        }
        /*
        cssmin: {
            app: {
                files: {
                    'dist/socketty.min.css': "dist/socketty.css"
                }
            }
        }
        */
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    //grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('build_project', [
        'concat',
        'uglify'
        //'cssmin'
    ]);

    grunt.registerTask('default', ['build_project']);
};