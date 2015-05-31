module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // Copy all the thirdparty libs into the client folder where they are accessible from web server
        copy: {
            bower: {
                files: [
                    {"expand": true, "src": "bower_components/**", "dest": "client/"}
                ]
            }
        },
        // Concatenates all the web components
        vulcanize: {
            app: {
                options: {},
                files: {
                    "dist/elements.vulcanized.html": "client/elements/elements.html"
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-vulcanize');

    grunt.registerTask('copy_bower', [
        'copy:bower'
    ]);

    grunt.registerTask('build', [
        'vulcanize'
    ]);

    grunt.registerTask('default', ['copy_bower']);
};