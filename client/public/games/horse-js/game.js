/*
 * Horse Racing Game - UG Casino Edition
 * Modified for UGX currency, per-horse odds, and admin-configurable laps
 */

function Horse(id, x, y){
    this.element = document.getElementById(id);
    this.speed = Math.random()*10 + 10;
    this.originX = x;
    this.originY = y;
    this.x = x;
    this.y = y;
    this.number = parseInt(id.replace(/[\D]/g, ''));
    this.lap = 0;

    this.moveRight = function(){
        var horse = this;
        setTimeout(function(){
            horse.x ++;
            horse.element.style.left = horse.x +'vw';
            if (horse.lap >= _maxLaps && horse.x > horse.originX + 6){
                horse.arrive();
            }else{
                if (horse.x < 82.5 - horse.number*2.5){
                    horse.moveRight();
                }else{
                    horse.element.className = 'horse runDown';
                    horse.speed = Math.random()*10 + 10;
                    horse.moveDown();
                }
            }
        }, 1000/this.speed);
    };

    this.moveDown = function(){
        var horse = this;
        setTimeout(function(){
            horse.y ++;
            horse.element.style.top = horse.y +'vh';
            if (horse.y < horse.originY + 65){
                horse.moveDown();
            }else{
                horse.element.className = 'horse runLeft';
                horse.speed = Math.random()*10 + 10;
                horse.moveLeft();
            }
        }, 1000/this.speed);
    };

    this.moveLeft = function(){
        var horse = this;
        setTimeout(function(){
            horse.x --;
            horse.element.style.left = horse.x +'vw';
            if (horse.x > 12.5 - horse.number*2.5){
                horse.moveLeft();
            }else{
                horse.element.className = 'horse runUp';
                horse.speed = Math.random()*10 + 10;
                horse.moveUp();
            }
        }, 1000/this.speed);
    };

    this.moveUp = function(){
        var horse = this;
        setTimeout(function(){
            horse.y --;
            horse.element.style.top = horse.y +'vh';
            if (horse.y > horse.originY){
                horse.speed = Math.random()*10 + 10;
                horse.moveUp();
            }else{
                horse.element.className = 'horse runRight';
                horse.lap ++;
                horse.moveRight();
            }
        }, 1000/this.speed);
    };

    this.run = function(){
        this.element.className = 'horse runRight';
        this.x = this.originX;
        this.y = this.originY;
        this.element.style.left = this.x + 'vw';
        this.element.style.top = this.y + 'vh';
        this.lap = 0;
        this.speed = Math.random()*10 + 10;
        this.moveRight();
    };

    this.arrive = function(){
        this.element.className = 'horse standRight';
        this.lap = 0;
        if (typeof onHorseArrive === 'function') {
            onHorseArrive(this.number);
        }
    };
}

document.addEventListener("DOMContentLoaded", function(event) {
    _horse1 = new Horse('horse1', 20, 4);
    _horse2 = new Horse('horse2', 20, 8);
    _horse3 = new Horse('horse3', 20, 12);
    _horse4 = new Horse('horse4', 20, 16);
});
