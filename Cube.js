class Cube{
    constructor(){
        this.type = 'cube';
        //this.position = [.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0]; // Default color is white
        //this.size = 5.0;
        //this.segments = 10;
        this.matrix = new Matrix4();
    }

    render(){
        //var xy = this.position;
        var rgba = this.color;
        //var size = this.size;

        //pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        //pass the matrix to u_ModelMatrix attribute
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        //       y
        //       ↑
        // |
        // |      D__________C
        // |     /|         /|
        // |    / |        / |
        // |   H__|_______G  |
        // |   |  |       |  |
        // |   |  A_______|__B   → x
        // |   | /        | /
        // |   |/         |/
        // |   E__________F

        //A(0,0,0) B(1,0,0) C(1,1,0) D(0,1,0)
        //E(0,0,1) F(1,0,1) G(1,1,1) H(0,1,1)

 

        //front
        drawTriangle3D([0.0,0.0,0.0,   1.0, 1.0, 0.0,     1.0, 0.0, 0.0]);
        drawTriangle3D([0.0,0.0,0.0,   0.0, 1.0, 0.0,     1.0, 1.0, 0.0]);

        //back
        drawTriangle3D([0.0,0.0,1.0,   1.0, 1.0, 1.0,     1.0, 0.0, 1.0]);
        drawTriangle3D([0.0,0.0,1.0,   0.0, 1.0, 1.0,     1.0, 1.0, 1.0]);

        gl.uniform4f(u_FragColor, rgba[0]*.8, rgba[1]*.8, rgba[2]*.8, rgba[3]);
        //bottom
        drawTriangle3D([0.0,0.0,0.0,   1.0, 0.0, 0.0,     1.0, 0.0, 1.0]);
        drawTriangle3D([0.0,0.0,0.0,   1.0, 0.0, 1.0,     0.0, 0.0, 1.0]);
    

        //top
        drawTriangle3D([0.0,1.0,0.0,   1.0, 1.0, 0.0,     1.0, 1.0, 1.0]);
        drawTriangle3D([0.0,1.0,0.0,   1.0, 1.0, 1.0,     0.0, 1.0, 1.0]);

        gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
        //left
        drawTriangle3D([0.0,1.0,1.0,   0.0, 1.0, 0.0,     0.0, 0.0, 0.0]);
        drawTriangle3D([0.0,1.0,1.0,   0.0, 0.0, 0.0,     0.0, 0.0, 1.0]);
        
        //right
        drawTriangle3D([1.0,1.0,1.0,   1.0, 1.0, 0.0,     1.0, 0.0, 0.0]);
        drawTriangle3D([1.0,1.0,1.0,   1.0, 0.0, 0.0,     1.0, 0.0, 1.0]);

    }
}