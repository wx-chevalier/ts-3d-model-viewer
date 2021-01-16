clear all

%读取文件到cell数组中
fid=fopen('20X20asc.cli','r+');%打开文件夹并获取文件标识号
% a=textscan(fid,'%s');
p=1; %初始化计数器
while feof(fid)==0 %读取每行的字符，并存储在cell数组中
    tline{p,1}=fgetl(fid);
    p=p+1;
end
fclose(fid);%关闭文件夹

%读取cell数组中“/”后的字符到数组中
% point=[];
z=[];
for j=9:(length(tline)-1) %cell数组元素个数  24
    p=1; l=1;
    for k=1:numel(tline{j}) %cell数组元素字符串个数
         
         if tline{j,1}(k)=='/' %当读到‘/’后将后面的字符存入point（，）二维数组中
            p=k; l=1;
         end
        point(j-8,l)=tline{j,1}(p);
        p=p+1; l=l+1;
    end 
end  %得到的数组中包含“/”
point=char(point);  %将double数组变成了char数组
point(:,1)=[]; %删除point数组第一列的‘/’元素
a=size(point); %得到数组矩阵的行数和列数分别为a(1),a(2)
% npoint=[];
for i=1:a(1) %将字符串数组转为数字数组
     npoint{i,:}=sscanf(point(i,:),'%f,');
end 

%分离part、dir、num、（P1x，P1y）2108/8/15
%把x坐标放在npoint{i，2}，y坐标放在npoint{i，3},z坐标放在npoint{i，4}，单个行是层高
for i=1:a(1)
    l=1;k=1;
    if length(npoint{i,1})==1
        npoint{i,2}=npoint{i,1}; 
        z=npoint{i,2};
    else
        for j=4:length(npoint{i,1})
            if mod(j,2)==0
                npoint{i,2}(l)=npoint{i,1}(j);%x坐标cell{i，2}
                %x(l)=npoint{i,2}(l);
                l=l+1;
            else
                npoint{i,3}(k)=npoint{i,1}(j);%y坐标cell{i，3}
                %y(k)=npoint{i,3}(k);
                k=k+1;
                npoint{i,4}(k)=z;%z坐标cell{i，4}
            end
        end 
        npoint{i,4}(1)=[];
        scatter3(npoint{i,2},npoint{i,3},npoint{i,4},'*'); %画出散点图
        plot3(npoint{i,2},npoint{i,3},npoint{i,4}); %画出轮廓
        hold on;
    end 
end

%首先要删除重点，然后要删除共线点

%删除共线点
b=[]; %记录共线点位置
for i=1:a(1) %行计数
    k=1;
    if mod(i,2)==0 
        for j=3:length(npoint{i,2}) %点计数
            %如果三角形面积为零，则记录中间点在数组中的位置
            if(npoint{i,2}(j-2)-npoint{i,2}(j))*(npoint{i,3}(j-1)-npoint{i,3}(j))-(npoint{i,2}(j-1)-npoint{i,2}(j))*(npoint{i,3}(j-2)-npoint{i,3}(j))==0;
                b(k)=j-1; %记录共线点位置
                k=k+1; %计数器加1
                %npoint{i,2}(j-1)=100; npoint{i,3}(j-1)=100;
            end
        end
        for l=1:length(b) %删除中间点
            npoint{i,2}(b(l))=[]; npoint{i,3}(b(l))=[]; npoint{i,4}(b(l))=[];
        end 
        %scatter3(npoint{i,2},npoint{i,3},npoint{i,4},'*');
       
        %plot3(npoint{i,2},npoint{i,3},npoint{i,4}); %画出轮廓
        %hold on;
    end
end
                            
                