## DevOps:

# SSH
sudo ssh -i "Broodbox-app-key.pem" ubuntu@ec2-51-20-39-36.eu-north-1.compute.amazonaws.com



# Copy Build.zip
sudo scp -i Broodbox-app-key.pem ./broodbox-frontend/build.zip ubuntu@ec2-51-20-39-36.eu-north-1.compute.amazonaws.com:/home/ubuntu

sudo rm -r /var/www/html/broodbox/* && sudo mv build.zip /var/www/html/broodbox/ && cd /var/www/html/broodbox/ && sudo unzip build.zip


# Update Backend
cd broodbox-backend/ && pm2 stop 0 && pm2 delete 0 && git reset --hard HEAD && git status && git pull
pm2 start ecosystem.config.json 
pm2 ls && pm2 logs 0
sudo systemctl restart nginx