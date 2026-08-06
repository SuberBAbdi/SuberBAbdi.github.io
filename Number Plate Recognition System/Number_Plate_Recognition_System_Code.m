classdef Final < matlab.apps.AppBase

    % Properties that correspond to app components
    properties (Access = public)
        UIFigure matlab.ui.Figure
        HistogramButton matlab.ui.control.Button
        Histogram2Button matlab.ui.control.Button
        Histogram3Button matlab.ui.control.Button
        RESETButton matlab.ui.control.Button
        GrayscaleImageButton matlab.ui.control.Button
        GrayscaleImage2Button matlab.ui.control.Button
        GrayscaleImage3Button matlab.ui.control.Button
        LoadImageButton matlab.ui.control.Button
        LoadImage2Button matlab.ui.control.Button
        LoadImage3Button matlab.ui.control.Button
        UIAxes9 matlab.ui.control.UIAxes
        UIAxes8 matlab.ui.control.UIAxes
        UIAxes7 matlab.ui.control.UIAxes
        UIAxes6 matlab.ui.control.UIAxes
        UIAxes5 matlab.ui.control.UIAxes
        UIAxes4 matlab.ui.control.UIAxes
        UIAxes3 matlab.ui.control.UIAxes
        UIAxes2 matlab.ui.control.UIAxes
        UIAxes matlab.ui.control.UIAxes
    end
    
    % Callbacks that handle component events
    methods (Access = private)
        % Button down function: UIAxes
        function UIAxesButtonDown(~, ~)

        end
        % Button pushed function: LoadImageButton
        function LoadImageButtonPushed(app, ~)
            global I;
            [filename,pathname]= uigetfile('*.*', 'Load Image');
            filename=strcat(pathname,filename);
            I=imread(filename);
            imshow(I,'Parent',app.UIAxes);
        end

        % Button pushed function: LoadImage2Button
        function LoadImage2ButtonPushed(app, ~)
            global I2;
            [filename,pathname]= uigetfile('*.*', 'Load Image');
            filename=strcat(pathname,filename);
            I2=imread(filename);
            imshow(I2,'Parent',app.UIAxes4);
        end

        % Button pushed function: LoadImage3Button
        function LoadImage3ButtonPushed(app, ~)
            global I3;
            [filename,pathname]= uigetfile('*.*', 'Load Image');
            filename=strcat(pathname,filename);
            I3=imread(filename);
            imshow(I3,'Parent',app.UIAxes7);
        end

        % Button pushed function: GrayscaleImageButton
        function GrayscaleImageButtonPushed(app, ~)
            global I;
            global J;
            rgb_values = [0.299,0.587, 0.114];
            J = rgb_values(1) * I(:,:,1) + ...
                rgb_values(2) * I(:,:,2) + ...
                rgb_values(3) * I(:,:,3);
            imshow(J, 'Parent',app.UIAxes2)
        end

        % Button pushed function: GrayscaleImage2Button
        function GrayscaleImage2ButtonPushed(app, ~)
            global I2;
            global J2;
            rgb_values = [0.299,0.587, 0.114];
            J2 = rgb_values(1) * I2(:,:,1) + ...
                 rgb_values(2) * I2(:,:,2) + ...
                 rgb_values(3) * I2(:,:,3);
            imshow(J2, 'Parent',app.UIAxes5)
        end

        % Button pushed function: GrayscaleImage3Button
        function GrayscaleImage3ButtonPushed(app, ~)
            global I3;
            global J3;
            rgb_values = [0.299,0.587, 0.114];
            J3 = rgb_values(1) * I3(:,:,1) + ...
                 rgb_values(2) * I3(:,:,2) + ...
                 rgb_values(3) * I3(:,:,3);
            imshow(J3, 'Parent',app.UIAxes8)
        end

        % Button pushed function: RESETButton
        function RESETButtonPushed(app, ~)
            cla(app.UIAxes, 'reset');
            cla(app.UIAxes2, 'reset');
            cla(app.UIAxes3, 'reset');
            cla(app.UIAxes4, 'reset');
            cla(app.UIAxes5, 'reset');
            cla(app.UIAxes6, 'reset');
            cla(app.UIAxes7, 'reset');
            cla(app.UIAxes8, 'reset');
            cla(app.UIAxes9, 'reset');
            title(app.UIAxes,"");
            title(app.UIAxes2,"");
            title(app.UIAxes3,"");
            title(app.UIAxes4,"");
            title(app.UIAxes5,"");
            title(app.UIAxes6,"");
            title(app.UIAxes7,"");
            title(app.UIAxes8,"");
            title(app.UIAxes9,"");
        end

        % Button pushed function: HistogramButton
        function HistogramButtonPushed(app, ~)
            global I;
            global J;      
            Intensity=Hist(J);
            bar(app.UIAxes3,0:255,Intensity);
            J = Processing(J); % Does all processing functions and saves it to J 
        end

        % Button pushed function: HistogramButton2
        function Histogram2ButtonPushed(app, ~)
            global I2;
            global J2;
            Intensity=Hist(J2);
            bar(app.UIAxes6,0:255,Intensity);
            J2 = Processing(J2); % Does all processing functions and saves it to J2   
        end

        % Button pushed function: HistogramButton3
        function Histogram3ButtonPushed(app, ~)
            global I3;
            global J3;
            Intensity=Hist(J3);
            bar(app.UIAxes9,0:255,Intensity);
            J3 = Processing(J3); % % Does all processing functions and saves it to J3
        end
    end
    
    % Component initialization
    methods (Access = private)

        % Create UIFigure and components
        function createComponents(app)
           
            % Create UIFigure and hide until all components are created
            app.UIFigure = uifigure('Visible', 'off');
            app.UIFigure.Position = [100 100 960 600];
            app.UIFigure.Name = 'GUI of License Plate Detection';
    
            % Create UIAxes
            app.UIAxes = uiaxes(app.UIFigure);
            title(app.UIAxes, 'Image 1')
            app.UIAxes.XTick = [];
            app.UIAxes.YTick = [];
            app.UIAxes.Color = [1 1 0];
            app.UIAxes.Box = 'on';
            app.UIAxes.ButtonDownFcn = createCallbackFcn(app, @UIAxesButtonDown, true);
            colormap(app.UIAxes, 'summer')
            app.UIAxes.Position = [20 400 280 150];
    
            % Create UIAxes2
            app.UIAxes2 = uiaxes(app.UIFigure);
            title(app.UIAxes2, 'Grayscale Image 1')
            app.UIAxes2.XTick = [];
            app.UIAxes2.YTick = [];
            app.UIAxes2.Color = [0.0588 1 1];
            app.UIAxes2.Box = 'on';
            app.UIAxes2.Position = [320 400 280 150];
    
            % Create UIAxes3
            app.UIAxes3 = uiaxes(app.UIFigure);
            title(app.UIAxes3, 'Histogram of Image 1')
            xlabel(app.UIAxes3, 'Intensity(Brightness)')
            ylabel(app.UIAxes3, 'No. Of Pixels')
            zlabel(app.UIAxes3, 'Z')
            app.UIAxes3.Position = [620 400 280 150];

            % Create UIAxes4
            app.UIAxes4 = uiaxes(app.UIFigure);
            title(app.UIAxes4, 'Image 2')
            app.UIAxes4.XTick = [];
            app.UIAxes4.YTick = [];
            app.UIAxes4.Color = [1 1 0];
            app.UIAxes4.Box = 'on';
            app.UIAxes4.ButtonDownFcn = createCallbackFcn(app, @UIAxesButtonDown, true);
            colormap(app.UIAxes4, 'summer')
            app.UIAxes4.Position = [20 220 280 150];
    
            % Create UIAxes5
            app.UIAxes5 = uiaxes(app.UIFigure);
            title(app.UIAxes5, 'Grayscale of Image 2')
            app.UIAxes5.XTick = [];
            app.UIAxes5.YTick = [];
            app.UIAxes5.Color = [0.0588 1 1];
            app.UIAxes5.Box = 'on';
            app.UIAxes5.Position = [320 220 280 150];
    
            % Create UIAxes6
            app.UIAxes6 = uiaxes(app.UIFigure);
            title(app.UIAxes6, 'Histogram of Image 2')
            xlabel(app.UIAxes6, 'Intensity(Brightness)')
            ylabel(app.UIAxes6, 'No. Of Pixels')
            zlabel(app.UIAxes6, 'Z')
            app.UIAxes6.Position = [620 220 280 150];
    
            % Create UIAxes7
            app.UIAxes7 = uiaxes(app.UIFigure);
            title(app.UIAxes7, 'Image 3')
            app.UIAxes7.XTick = [];
            app.UIAxes7.YTick = [];
            app.UIAxes7.Color = [1 1 0];
            app.UIAxes7.Box = 'on';
            app.UIAxes7.ButtonDownFcn = createCallbackFcn(app, @UIAxesButtonDown, true);
            colormap(app.UIAxes7, 'summer')
            app.UIAxes7.Position = [20 40 280 150];
    
            % Create UIAxes8
            app.UIAxes8 = uiaxes(app.UIFigure);
            title(app.UIAxes8, 'Grayscale of Image 3')
            app.UIAxes8.XTick = [];
            app.UIAxes8.YTick = [];
            app.UIAxes8.Color = [0.0588 1 1];
            app.UIAxes8.Box = 'on';
            app.UIAxes8.Position = [320 40 280 150];
    
            % Create UIAxes9
            app.UIAxes9 = uiaxes(app.UIFigure);
            title(app.UIAxes9, 'Histogram of Image 3')
            xlabel(app.UIAxes9, 'Intensity(Brightness)')
            ylabel(app.UIAxes9, 'No. Of Pixels')
            zlabel(app.UIAxes9, 'Z')
            app.UIAxes9.Position = [620 40 280 150];
            
    
            % Create LoadImageButton
            app.LoadImageButton = uibutton(app.UIFigure, 'push');
            app.LoadImageButton.ButtonPushedFcn = createCallbackFcn(app, @LoadImageButtonPushed, true);
            app.LoadImageButton.Position = [110 380 100 20];
            app.LoadImageButton.Text = 'Load Image 1';

            % Create LoadImage2Button
            app.LoadImage2Button = uibutton(app.UIFigure, 'push');
            app.LoadImage2Button.ButtonPushedFcn = createCallbackFcn(app, @LoadImage2ButtonPushed, true);
            app.LoadImage2Button.Position = [110 200 100 20];
            app.LoadImage2Button.Text = 'Load Image 2';

            % Create LoadImage3Button
            app.LoadImage3Button = uibutton(app.UIFigure, 'push');
            app.LoadImage3Button.ButtonPushedFcn = createCallbackFcn(app, @LoadImage3ButtonPushed, true);
            app.LoadImage3Button.Position = [110 20 100 20];
            app.LoadImage3Button.Text = 'Load Image 3';

           
            % Create GrayscaleImageButton
            app.GrayscaleImageButton = uibutton(app.UIFigure,'push');
            app.GrayscaleImageButton.ButtonPushedFcn = createCallbackFcn(app, @GrayscaleImageButtonPushed, true);
            app.GrayscaleImageButton.Position = [410 380 100 20];
            app.GrayscaleImageButton.Text = 'Grayscale Image';

            % Create GrayscaleImage2Button
            app.GrayscaleImage2Button = uibutton(app.UIFigure,'push');
            app.GrayscaleImage2Button.ButtonPushedFcn = createCallbackFcn(app, @GrayscaleImage2ButtonPushed, true);
            app.GrayscaleImage2Button.Position = [410 200 100 20];
            app.GrayscaleImage2Button.Text = 'Grayscale Image 2';

            % Create GrayscaleImage3Button
            app.GrayscaleImage3Button = uibutton(app.UIFigure,'push');
            app.GrayscaleImage3Button.ButtonPushedFcn = createCallbackFcn(app, @GrayscaleImage3ButtonPushed, true);
            app.GrayscaleImage3Button.Position = [410 20 100 20];
            app.GrayscaleImage3Button.Text = 'Grayscale Image';
    
            % Create RESETButton
            app.RESETButton = uibutton(app.UIFigure, 'push');
            app.RESETButton.ButtonPushedFcn = createCallbackFcn(app, @RESETButtonPushed, true);
            app.RESETButton.WordWrap = 'on';
            app.RESETButton.BackgroundColor = [1 0 0];
            app.RESETButton.FontSize = 14;
            app.RESETButton.FontWeight = 'bold';
            app.RESETButton.Position = [20 560 100 25];
            app.RESETButton.Text = 'RESET';

            % Create HistogramButton
            app.HistogramButton = uibutton(app.UIFigure, 'push');
            app.HistogramButton.ButtonPushedFcn = createCallbackFcn(app, @HistogramButtonPushed, true);
            app.HistogramButton.Position = [710 380 130 20];
            app.HistogramButton.Text = 'Histogram of Image 1';

            % Create Histogram2Button
            app.Histogram2Button = uibutton(app.UIFigure, 'push');
            app.Histogram2Button.ButtonPushedFcn = createCallbackFcn(app, @Histogram2ButtonPushed, true);
            app.Histogram2Button.Position = [710 200 130 20];
            app.Histogram2Button.Text = 'Histogram of Image 2';

            % Create Histogram3Button
            app.Histogram3Button = uibutton(app.UIFigure, 'push');
            app.Histogram3Button.ButtonPushedFcn = createCallbackFcn(app, @Histogram3ButtonPushed, true);
            app.Histogram3Button.Position = [710 20 130 20];
            app.Histogram3Button.Text = 'Histogram of Image 3';

            % Show the figure after all components are created
            app.UIFigure.Visible = 'on';

        end
    end

    % App creation and deletion
    methods (Access = public)

        % Construct app
        function app = Final

            % Create UIFigure and components
            createComponents(app)
    
            % Register the app with App Designer
            registerApp(app, app.UIFigure)
    
        end

        % Code that executes before app deletion
        function delete(app)

            % Delete UIFigure when app is deleted
            delete(app.UIFigure)
        end
    end
end

function C = rmsContrast(img)
    img = double(img);
    C = sqrt(mean((img(:) - mean(img(:))).^2));
end

function Binarize = Processing(I)
    b = im2bw(I,0.5);
    SE = ones(3,3);
    ID = imdilate(b,SE);
    Binarize = imerode (ID,SE);
end

function h = Hist(img)
    [rows, cols] = size(img); % Finds how many pixels the image has
    h = zeros(1, 256); % Creates empty area of 256 zeros
    
    % For loops to iterate through each of the 256 "pixels"
    for r = 1:rows % Starts at first row
        for c = 1:cols % Starts at first column
            Var = img(r, c); % Saves the value of the pixel
            h(Var + 1) = h(Var + 1) + 1; % The right side will take the number add 1 to it then change the left side
            % The x-axis is the intensity(brightness) of the pixel
            % The y-axis is the no. of pixels that share the same shade of grey
            % If the left side has more lines the image is closer to black,
            % If the right has more the image is closer to white
        end
    end
end
