sudo su
cd ~

# Set timezone to use here
ln -sf /usr/share/zoneinfo/Europe/Oslo /etc/localtime

# Download updated yum repositories (epel and remi for php 5.5)
wget http://dl.fedoraproject.org/pub/epel/6/i386/epel-release-6-8.noarch.rpm
wget http://rpms.famillecollet.com/enterprise/remi-release-6.rpm
rpm -Uvh remi-release-6*.rpm epel-release-6*.rpm

# Install php and apache (also with mod_ssl for https support) (gcc-c++ openssl-devel and pcre-devel in order to compile haproxy with ssl support)
yum -y --enablerepo=remi,remi-php55 install httpd mod_ssl php php-pear php-common php-devel php-cli php-pecl-xdebug php-pdo php-opcache php-mbstring php-mcrypt php-xml gcc-c++ openssl-devel pcre-devel

# Enable xdebug in php.ini
echo "
[xdebug]
xdebug.remote_host=10.0.2.2
xdebug.remote_enable=on
xdebug.remote_connect_back=off
xdebug.profiler_enable=off
xdebug.profiler_output_dir=/vagrant/profiles" >> /etc/php.ini

# Link test/functional/web to web page
rmdir /var/www/html
ln -s /vagrant/client /var/www/html

# Generate dummy ssl certificate
openssl req \
    -new \
    -newkey rsa:2048 \
    -days 1000 \
    -nodes \
    -x509 \
    -subj "/C=EN/ST=Vagrant Province/L=Vagrant City/O=Socketty Corp/CN=localhost" \
    -keyout /etc/pki/tls/private/dummycert.key \
    -out /etc/pki/tls/certs/dummycert.crt

# Create a pem format file from the certificate, to be used by haproxy
cat /etc/pki/tls/certs/dummycert.crt /etc/pki/tls/private/dummycert.key > /etc/pki/tls/private/dummycert.pem

# Disable sendfile, as that doesnt work properly inside vagrant
sed -i 's/.*#EnableSendfile.*/EnableSendfile off/' /etc/httpd/conf/httpd.conf

# Stop apache listening on port 443
sed -i 's/Listen 443/#Listen 443/' /etc/httpd/conf.d/ssl.conf

# Enable UDP syslog for haproxy logging
sed -i 's/#\$ModLoad imudp/$ModLoad imudp/' /etc/rsyslog.conf
sed -i 's/#\$UDPServerRun 514/$UDPServerRun 514/' /etc/rsyslog.conf
echo "\$UDPServerAddress 127.0.0.1" >> /etc/rsyslog.conf
echo "local2.* /var/log/haproxy.log" > /etc/rsyslog.d/haproxy.conf
service rsyslog restart

# Download and install haproxy
wget http://www.haproxy.org/download/1.5/src/haproxy-1.5.12.tar.gz
tar -zxvf haproxy-1.5.12.tar.gz
cd haproxy-1.5.12

# Enable some extra stuff, most notably SSL. We needed openssl-devel and pcre-devel installed for this.
make TARGET=linux2628 USE_PCRE=1 USE_OPENSSL=1 USE_ZLIB=1 USE_CRYPT_H=1 USE_LIBCRYPT=1
make install

# Copy the haproxy config file and start it
mkdir /etc/haproxy
cp /vagrant/haproxy.cfg /etc/haproxy/haproxy.cfg
cp /vagrant/haproxy.init /etc/init.d/haproxy

service haproxy start
chkconfig haproxy on

# Manual start (not used):
# /usr/local/sbin/haproxy -f /vagrant/haproxy.cfg -p /var/run/haproxy.pid -D

# Install memcached
yum -y install memcached

echo 'PORT="11211"
USER="memcached"
MAXCONN="1024"
CACHESIZE="64"
OPTIONS="-l 127.0.0.1"' > /etc/sysconfig/memcached

# Install memcached for php (and some required libraries)
yum -y --enablerepo=remi,remi-php55 install zlib-devel libmemcached-devel php-pecl-memcached
pecl install memcached

# Start services
service httpd start
service memcached start

# Make sure services start on system startup
chkconfig httpd on
chkconfig memcached on