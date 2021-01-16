function  npoint  = read_ASCII_CLI(filename)
%读取文件到cell数组中
fid=fopen(filename,'r+');%打开文件夹并获取文件标识号
% a=textscan(fid,'%s');
p=1; %初始化计数器
while feof(fid)==0 %读取每行的字符，并存储在cell数组中
    tline{p,1}=fgetl(fid);
    p=p+1;
end
fclose(fid);%关闭文件夹

%读取cell数组中“/”后的字符到数组中 npoint()
% point=[];
z=[];
for j=9:(length(tline)-1) %cell数组元素个数  24
    p=1; l=1;
    for k=1:numel(tline{j}) %cell数组元素字符串个数
         
         if tline{j,1}(k)=='/' %当读到‘/’后将后面的字符存入point（，）二维数组中
            p=k;l=1;
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
%把x坐标放在npoint{i，2}，y坐标放在npoint{i，3},z坐标放在npoint{i，4}
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
        %plot3(npoint{i,2},npoint{i,3},npoint{i,4});%将轮廓点描出来
        %hold on;
    end 
end
end

